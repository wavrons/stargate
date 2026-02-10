// This file holds the encrypted GitHub PAT.
// You will generate this string using the "Setup" mode in the Login screen.
export const ENCRYPTED_PAT = import.meta.env.VITE_ENCRYPTED_PAT || '';

// Configuration for the private data repo
export const REPO_CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME', // Replace with your GitHub username
  repo: 'stargate-data',         // The private repo name
  path: 'data/travel-data.json',
  branch: 'main'
};
