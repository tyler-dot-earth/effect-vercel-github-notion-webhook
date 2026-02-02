import {
	NotionWorkflowStatus,
	type NotionWorkflowStatus as NotionWorkflowStatusType,
} from "#services/notion/schema.ts";

export type NotionStatusTransitionRule = "*" | ReadonlyArray<string>;

export type NotionStatusTransitionRules = Readonly<
	Record<NotionWorkflowStatusType, NotionStatusTransitionRule>
>;

const workflowStatuses = Object.values(NotionWorkflowStatus);

/**
 * Default workflow constraint:
 * - allow updates only within the workflow statuses (prevents overwriting
 *   manual states like "QA ready")
 * - allow merged status to always win by default
 */
export const defaultNotionStatusTransitionRules = {
	[NotionWorkflowStatus.InProgress]: [
		NotionWorkflowStatus.InProgress,
		NotionWorkflowStatus.InReview,
	],
	[NotionWorkflowStatus.InReview]: [
		NotionWorkflowStatus.InProgress,
		NotionWorkflowStatus.InReview,
	],
	[NotionWorkflowStatus.PRMerged]: "*",
} as const satisfies NotionStatusTransitionRules;

export const parseNotionStatusTransitionRulesJson = (
	json: string,
): Partial<NotionStatusTransitionRules> => {
	const parsed: unknown = JSON.parse(json);

	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(
			"NOTION_STATUS_TRANSITION_RULES must be a JSON object mapping status -> rule",
		);
	}

	const obj = parsed as Record<string, unknown>;
	const out: Partial<
		Record<NotionWorkflowStatusType, NotionStatusTransitionRule>
	> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (!workflowStatuses.includes(key as NotionWorkflowStatusType)) {
			// ignore unknown keys so users can share configs across multiple workflows
			continue;
		}

		if (value === "*" || value === null) {
			out[key as NotionWorkflowStatusType] = "*";
			continue;
		}

		if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
			out[key as NotionWorkflowStatusType] = value;
		}
	}

	return out;
};

export const buildNotionStatusTransitionRules = (options: {
	json?: string | undefined;
}): NotionStatusTransitionRules => {
	if (!options.json) {
		return defaultNotionStatusTransitionRules;
	}

	const overrides = parseNotionStatusTransitionRulesJson(options.json);
	return {
		...defaultNotionStatusTransitionRules,
		...overrides,
	};
};

export const isNotionStatusTransitionAllowed = (params: {
	currentStatus: string | null;
	nextStatus: NotionWorkflowStatusType;
	rules: NotionStatusTransitionRules;
}): { allowed: boolean; requiredPrevious: NotionStatusTransitionRule } => {
	const requiredPrevious = params.rules[params.nextStatus];

	if (requiredPrevious === "*") {
		return { allowed: true, requiredPrevious };
	}

	// If we can't determine the current status, treat it as "unknown" and allow.
	if (params.currentStatus === null) {
		return { allowed: true, requiredPrevious };
	}

	return {
		allowed: requiredPrevious.includes(params.currentStatus),
		requiredPrevious,
	};
};
