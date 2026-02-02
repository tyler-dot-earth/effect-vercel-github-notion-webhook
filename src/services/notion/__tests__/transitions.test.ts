import { assert, describe, it } from "@effect/vitest";
import { NotionWorkflowStatus } from "#services/notion/schema.ts";
import {
	buildNotionStatusTransitionRules,
	isNotionStatusTransitionAllowed,
} from "#services/notion/transitions.ts";

describe("notion transitions", () => {
	it("blocks overwriting manual status by default", () => {
		const rules = buildNotionStatusTransitionRules({});
		const result = isNotionStatusTransitionAllowed({
			currentStatus: "QA ready",
			nextStatus: NotionWorkflowStatus.InReview,
			rules,
		});

		assert.isFalse(result.allowed);
	});

	it("allows normal workflow transitions by default", () => {
		const rules = buildNotionStatusTransitionRules({});
		const result = isNotionStatusTransitionAllowed({
			currentStatus: NotionWorkflowStatus.InProgress,
			nextStatus: NotionWorkflowStatus.InReview,
			rules,
		});

		assert.isTrue(result.allowed);
	});

	it("treats unknown current status as allowed", () => {
		const rules = buildNotionStatusTransitionRules({});
		const result = isNotionStatusTransitionAllowed({
			currentStatus: null,
			nextStatus: NotionWorkflowStatus.InReview,
			rules,
		});

		assert.isTrue(result.allowed);
	});

	it("can be configured to allow additional previous statuses", () => {
		const rules = buildNotionStatusTransitionRules({
			json: JSON.stringify({
				[NotionWorkflowStatus.InReview]: [
					NotionWorkflowStatus.InProgress,
					NotionWorkflowStatus.InReview,
					"QA ready",
				],
			}),
		});
		const result = isNotionStatusTransitionAllowed({
			currentStatus: "QA ready",
			nextStatus: NotionWorkflowStatus.InReview,
			rules,
		});

		assert.isTrue(result.allowed);
	});
});
