import { Octokit } from 'octokit';

export interface POI {
  id: string;
  country: string;
  name: string;
  link?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface TravelData {
  pois: POI[];
  lastUpdated: string;
}

const REPO_OWNER = 'AlNino77';
const REPO_NAME = 'gate_records';
const FILE_PATH = 'data/travel-data.json';
const BRANCH = 'main';

export class GitHubStorage {
  private octokit: Octokit;
  private fileSha: string | null = null;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getData(): Promise<TravelData> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
        ref: BRANCH,
      });

      if ('content' in data) {
        this.fileSha = data.sha;
        const content = atob(data.content);
        return JSON.parse(content);
      }

      return { pois: [], lastUpdated: new Date().toISOString() };
    } catch (error) {
      if ((error as any).status === 404) {
        return { pois: [], lastUpdated: new Date().toISOString() };
      }
      throw error;
    }
  }

  async saveData(data: TravelData): Promise<void> {
    const content = btoa(JSON.stringify(data, null, 2));

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Update travel data - ${new Date().toISOString()}`,
      content,
      sha: this.fileSha || undefined,
      branch: BRANCH,
    });
  }

  async verifyToken(): Promise<boolean> {
    try {
      await this.octokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }
}
