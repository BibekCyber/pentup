package controller

// Ported from upstream vxcontrol/pentagi 6f3d29c3 ("feat: port major fixes"):
// closing the parts of a flow that its worker does not hold in memory.

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/subscriptions"

	"github.com/sirupsen/logrus"
)

// ErrFlowNotLoaded reports a flow that exists in the database but has no worker
// in memory, which is what happens when its provider stopped resolving.
var ErrFlowNotLoaded = fmt.Errorf("flow is not loaded")

func (fc *flowController) missingFlowError(ctx context.Context, flowID int64) error {
	if _, err := fc.db.GetFlow(ctx, flowID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrFlowNotFound
		}
		return fmt.Errorf("failed to get flow %d: %w", flowID, err)
	}

	return ErrFlowNotLoaded
}

// finishUnloadedFlow closes a flow without its worker: one that was never
// loaded, or one whose worker failed to close it. It finishes the flow's open
// work and assistants, marks it finished and releases its containers. It is
// safe to repeat.
func (fc *flowController) finishUnloadedFlow(ctx context.Context, flowID int64) error {
	flow, err := fc.db.GetFlow(ctx, flowID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrFlowNotFound
		}
		return fmt.Errorf("failed to get flow %d: %w", flowID, err)
	}

	publisher := fc.subs.NewFlowPublisher(flow.UserID, flowID)

	if err := fc.finishFlowWork(ctx, flowID, publisher); err != nil {
		return err
	}

	fc.finishFlowAssistants(ctx, flowID, publisher)

	closed := flow.Status == database.FlowStatusFinished || flow.Status == database.FlowStatusFailed

	var finished database.Flow
	if !closed {
		finished, err = fc.db.UpdateFlowStatus(ctx, database.UpdateFlowStatusParams{
			Status: database.FlowStatusFinished,
			ID:     flowID,
		})
		if err != nil {
			return fmt.Errorf("failed to finish flow %d: %w", flowID, err)
		}

		logrus.WithContext(ctx).WithFields(logrus.Fields{
			"flow":     flowID,
			"provider": flow.ModelProviderName,
		}).Warn("finished a flow that its worker did not close")

		// The worker's SetStatus normally runs this hook; a raw status write must
		// too, or the parent scan keeps showing "running". Best-effort: it logs and
		// never fails the finish.
		if finished.DomainID.Valid && fc.subs != nil {
			reconcileDomainStatus(ctx, fc.db, fc.subs, finished.DomainID.Int64)
		}
	}

	containers, containersErr := fc.releaseFlowContainers(ctx, flowID)

	if closed {
		return nil
	}

	if containersErr != nil {
		containers, containersErr = fc.db.GetFlowContainers(ctx, flowID)
		if containersErr != nil {
			logrus.WithContext(ctx).WithError(containersErr).
				Warnf("failed to read containers of flow %d twice, skipping its update event", flowID)
			return nil
		}
	}

	publisher.FlowUpdated(ctx, finished, containers)

	return nil
}

func (fc *flowController) finishFlowAssistants(
	ctx context.Context,
	flowID int64,
	publisher subscriptions.FlowPublisher,
) {
	assistants, err := fc.db.GetFlowAssistants(ctx, flowID)
	if err != nil {
		logrus.WithContext(ctx).WithError(err).
			Warnf("failed to get assistants of flow %d, leaving them as they are", flowID)
		return
	}

	for _, assistant := range assistants {
		if assistant.Status == database.AssistantStatusFinished ||
			assistant.Status == database.AssistantStatusFailed {
			continue
		}

		updated, err := fc.db.UpdateAssistantStatus(ctx, database.UpdateAssistantStatusParams{
			Status: database.AssistantStatusFinished,
			ID:     assistant.ID,
		})
		if err != nil {
			logrus.WithContext(ctx).WithError(err).
				Warnf("failed to finish assistant %d of flow %d", assistant.ID, flowID)
			continue
		}

		publisher.AssistantUpdated(ctx, updated)
	}
}

func (fc *flowController) releaseFlowContainers(
	ctx context.Context, flowID int64,
) ([]database.Container, error) {
	containers, err := fc.db.GetFlowContainers(ctx, flowID)
	if err != nil {
		logrus.WithContext(ctx).WithError(err).
			Warnf("failed to get containers of flow %d, finishing it without releasing them", flowID)
		return nil, err
	}

	released := false
	for _, container := range containers {
		if container.Status == database.ContainerStatusDeleted || !container.LocalID.Valid {
			continue
		}

		if err := fc.docker.RemoveContainer(ctx, container.LocalID.String, container.ID); err != nil {
			logrus.WithContext(ctx).WithError(err).
				Warnf("failed to release container %d of flow %d", container.ID, flowID)
			continue
		}
		released = true
	}

	if !released {
		return containers, nil
	}

	updated, err := fc.db.GetFlowContainers(ctx, flowID)
	if err != nil {
		return containers, nil
	}

	return updated, nil
}

// finishFlowLeftovers closes the flow's work and assistants in the database
// after its worker finished, including when that finish failed part way (for
// example on a sandbox that would not stop), so nothing stays open.
func (fc *flowController) finishFlowLeftovers(ctx context.Context, flowID int64) error {
	flow, err := fc.db.GetFlow(ctx, flowID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrFlowNotFound
		}
		return fmt.Errorf("failed to get flow %d: %w", flowID, err)
	}

	publisher := fc.subs.NewFlowPublisher(flow.UserID, flowID)

	if err := fc.finishFlowWork(ctx, flowID, publisher); err != nil {
		return err
	}

	fc.finishFlowAssistants(ctx, flowID, publisher)

	return nil
}

func (fc *flowController) finishFlowWork(
	ctx context.Context,
	flowID int64,
	publisher subscriptions.FlowPublisher,
) error {
	tasks, err := fc.db.GetFlowTasks(ctx, flowID)
	if err != nil {
		return fmt.Errorf("failed to get tasks of flow %d: %w", flowID, err)
	}

	for _, task := range tasks {
		subtasks, err := fc.db.GetTaskSubtasks(ctx, task.ID)
		if err != nil {
			return fmt.Errorf("failed to get subtasks of task %d: %w", task.ID, err)
		}

		hasFinishedSubtasks := false
		for _, subtask := range subtasks {
			if subtask.Status == database.SubtaskStatusFinished || subtask.Status == database.SubtaskStatusFailed {
				continue
			}

			if _, err := fc.db.UpdateSubtaskStatus(ctx, database.UpdateSubtaskStatusParams{
				Status: database.SubtaskStatusFinished,
				ID:     subtask.ID,
			}); err != nil {
				return fmt.Errorf("failed to finish subtask %d: %w", subtask.ID, err)
			}
			hasFinishedSubtasks = true
		}

		isTaskClosed := task.Status == database.TaskStatusFinished || task.Status == database.TaskStatusFailed
		if isTaskClosed && !hasFinishedSubtasks {
			continue
		}

		updated := task
		if !isTaskClosed {
			updated, err = fc.db.UpdateTaskStatus(ctx, database.UpdateTaskStatusParams{
				Status: database.TaskStatusFinished,
				ID:     task.ID,
			})
			if err != nil {
				return fmt.Errorf("failed to finish task %d: %w", task.ID, err)
			}
		}

		finishedSubtasks, err := fc.db.GetTaskSubtasks(ctx, task.ID)
		if err != nil {
			return fmt.Errorf("failed to get subtasks of task %d: %w", task.ID, err)
		}

		publisher.TaskUpdated(ctx, updated, finishedSubtasks)
	}

	return nil
}
