
export const ADMIN_ACCESS_CHECK_HINT =
  "GitHub: `gh api repos/{owner}/{repo} --jq '.permissions.admin'`, GitLab: `glab api projects/{id} --jq '.permissions.project_access.access_level'` (need >= 40)";
