import { describe, expect, it } from "vitest";
import {
  getDeploymentPrivacyNotice,
  isDeploymentPrivacyNoticeEnabled
} from "@/lib/config/deploymentPrivacy";

describe("deployment privacy notice config", () => {
  it("is hidden by default outside production", () => {
    expect(isDeploymentPrivacyNoticeEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isDeploymentPrivacyNoticeEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("is visible by default in production", () => {
    expect(isDeploymentPrivacyNoticeEnabled({ NODE_ENV: "production" })).toBe(true);
  });

  it("can be explicitly enabled or disabled", () => {
    expect(
      isDeploymentPrivacyNoticeEnabled({
        NODE_ENV: "development",
        DEPLOYMENT_PRIVACY_NOTICE: "true"
      })
    ).toBe(true);
    expect(
      isDeploymentPrivacyNoticeEnabled({
        NODE_ENV: "production",
        DEPLOYMENT_PRIVACY_NOTICE: "false"
      })
    ).toBe(false);
  });

  it("summarizes storage, upload, and AI-provider boundaries", () => {
    const notice = getDeploymentPrivacyNotice({
      NODE_ENV: "production"
    });

    expect(notice.enabled).toBe(true);
    expect(notice.mode).toBe("session_demo");
    expect(notice.storage).toContain("database");
    expect(notice.ownership).toContain("browser session cookies");
    expect(notice.uploads).toContain("Session-scoped uploads");
    expect(notice.ai).toContain("AI provider");
  });

  it("separates trusted-user mode from session-demo mode", () => {
    const notice = getDeploymentPrivacyNotice({
      NODE_ENV: "production",
      DOCUMENT_AUTH_REQUIRED: "true"
    });

    expect(notice.mode).toBe("trusted_user");
    expect(notice.title).toContain("Trusted user");
    expect(notice.ownership).toContain("X-AI-Brief-User-Id");
    expect(notice.ownership).toContain("X-AI-Brief-Workspace-Id");
    expect(notice.uploads).toContain("DOCUMENT_AUTH_REQUIRED=true");
  });
});
