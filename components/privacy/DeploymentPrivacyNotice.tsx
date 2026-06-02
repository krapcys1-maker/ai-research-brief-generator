import { getDeploymentPrivacyNotice } from "@/lib/config/deploymentPrivacy";

export function DeploymentPrivacyNotice() {
  const notice = getDeploymentPrivacyNotice();

  if (!notice.enabled) {
    return null;
  }

  return (
    <section className="deployment-privacy" aria-label={notice.title}>
      <strong>{notice.title}</strong>
      <p>{notice.storage}</p>
      <p>{notice.uploads}</p>
      <p>{notice.ai}</p>
    </section>
  );
}
