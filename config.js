// =============================================================================
//  App configuration
//  Edit the values below to match YOUR GitHub repository.
//  These values are PUBLIC and safe to commit.
// =============================================================================

export const APP_CONFIG = {
  // Used to link out to GitHub Issues (feedback / bug reports / content fixes)
  // and to fetch Releases for the in-app Changelog page.
  REPO_OWNER: "aadb-stack",
  REPO_NAME: "HSC-companion",

  // Where the app is hosted. Leave as-is for GitHub Pages project sites.
  get REPO_URL() {
    return `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}`;
  },
  get ISSUES_URL() {
    return `${this.REPO_URL}/issues`;
  },
  get NEW_ISSUE_URL() {
    return `${this.REPO_URL}/issues/new/choose`;
  },
  get RELEASES_API() {
    return `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/releases`;
  },
};
