import type { ReportModel, ReportScreenshot } from '@/lib/report-model';

interface EmbedOptions {
    maxWidth?: number;
    quality?: number;
}

export const embedImage = async (
    url: string,
    { maxWidth = 800, quality = 0.8 }: EmbedOptions = {},
): Promise<string | undefined> => {
    try {
        const response = await fetch(url, { credentials: 'include' });

        if (!response.ok) {
            return undefined;
        }

        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, maxWidth / bitmap.width);
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
            return undefined;
        }

        context.drawImage(bitmap, 0, 0, width, height);

        return canvas.toDataURL('image/jpeg', quality);
    } catch {
        return undefined;
    }
};

export const embedReportScreenshots = async (model: ReportModel): Promise<ReportModel> => {
    const pending = new Map<string, ReportScreenshot>();

    const collect = (shots: ReportScreenshot[] | undefined) => {
        for (const shot of shots ?? []) {
            if (!shot.dataUrl && shot.url && !pending.has(shot.id)) {
                pending.set(shot.id, shot);
            }
        }
    };

    for (const finding of model.findings) {
        collect(finding.screenshots);
    }

    for (const section of model.sections) {
        collect(section.screenshots);
        section.findings.forEach((finding) => collect(finding.screenshots));
    }

    if (pending.size === 0) {
        return model;
    }

    const resolved = new Map<string, string>();

    await Promise.all(
        [...pending.values()].map(async (shot) => {
            const dataUrl = await embedImage(shot.url);

            if (dataUrl) {
                resolved.set(shot.id, dataUrl);
            }
        }),
    );

    if (resolved.size === 0) {
        return model;
    }

    const patch = (shot: ReportScreenshot): ReportScreenshot =>
        resolved.has(shot.id) ? { ...shot, dataUrl: resolved.get(shot.id) } : shot;
    const patchFinding = (finding: (typeof model.findings)[number]) => ({
        ...finding,
        screenshots: finding.screenshots?.map(patch),
    });

    return {
        ...model,
        findings: model.findings.map(patchFinding),
        sections: model.sections.map((section) => ({
            ...section,
            findings: section.findings.map(patchFinding),
            screenshots: section.screenshots.map(patch),
        })),
    };
};
