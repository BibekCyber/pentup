package graph

import (
	"fmt"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
)

// normalizeTargetTypes validates the supplied GraphQL target types, removes
// duplicates while preserving order, and converts them into the
// []database.TargetType representation expected by the database layer. When no
// target types are provided it falls back to the platform default of ["general"].
func normalizeTargetTypes(targetTypes []model.TargetType) ([]database.TargetType, error) {
	if len(targetTypes) == 0 {
		return []database.TargetType{database.TargetType(model.TargetTypeGeneral)}, nil
	}

	seen := make(map[model.TargetType]struct{}, len(targetTypes))
	result := make([]database.TargetType, 0, len(targetTypes))
	for _, t := range targetTypes {
		if !t.IsValid() {
			return nil, fmt.Errorf("invalid target type: %s", t)
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		result = append(result, database.TargetType(t))
	}

	return result, nil
}
