import * as core from "@actions/core";
import * as github from "@actions/github";
import * as child from "child_process";
import { ActionInputs, JIRA } from "./types";

import { getJIRAClient } from "./utils";

const getInputs = (): ActionInputs => {
  const JIRA_TOKEN: string = core.getInput("jira-token", { required: true });
  const GITHUB_TOKEN: string = core.getInput("github-token", {
    required: true,
  });
  const JIRA_DOMAIN: string = core.getInput("jira-domain", {
    required: true,
  });
  const ISSUE_KEY: string = core.getInput("issue-key", {
    required: true,
  });
  const USERNAME: string = core.getInput("username", {
    required: true,
  });
  const JIRA_EMAIL: string = core.getInput("jira-email", {
    required: true,
  });
  return {
    ISSUE_KEY,
    JIRA_TOKEN,
    GITHUB_TOKEN,
    USERNAME,
    JIRA_EMAIL,
    JIRA_DOMAIN: JIRA_DOMAIN.endsWith("/")
      ? JIRA_DOMAIN.replace(/\/$/, "")
      : JIRA_DOMAIN
  };
};

async function executeDiff() {
  const diffPromise: Promise<string> = new Promise((resolve, reject) => {
    child.exec(`git diff --name-only origin/master...${github.context.payload.after}`, (error: Error | null, stdout: string, stderr: string) => {
      if (error || stderr) {
        reject(error || stderr);
      }
      resolve(stdout);
    });
  });
  return diffPromise;
}

async function run() {
  try {
    const inputs = getInputs();
    core.debug(`inputs: ${JSON.stringify(inputs, null, 2)}`);
    const { JIRA_TOKEN, GITHUB_TOKEN, JIRA_DOMAIN, ISSUE_KEY, USERNAME, JIRA_EMAIL } = inputs;
    
    const productsInFile = ["services/app", "services/recruit", "services/superadmin", "services/teamadmin"];
    const files = await executeDiff();
    const filesArr = files.split(/\n/);
    const productFilesOccurrence = productsInFile.map(p => filesArr.filter(f => f.includes(p)));
    console.log(productFilesOccurrence)
    const apps: string[] = [];
    productFilesOccurrence[0].length ? apps.push("app") : null;
    productFilesOccurrence[1].length ? apps.push("recruit") : null;
    productFilesOccurrence[2].length ? apps.push("superadmin") : null;
    productFilesOccurrence[3].length ? apps.push("teamadmin") : null;
    console.log(apps)
    // const { pull_request: pullRequest } = github.context.payload;

    // if (typeof pullRequest === "undefined") {
    //   throw new Error(`Missing 'pull_request' from github action context.`);
    // }

    // github octokit client with given token
    const octokit = github.getOctokit(GITHUB_TOKEN);

    const username = USERNAME;
    if (!username) throw new Error("Cannot find PR owner");

    const { data: user } = await octokit.users.getByUsername({
      username,
    });

    if (!user?.name) throw new Error(`User not found: ${USERNAME} ${user?.name}`);

    const jira = getJIRAClient(JIRA_DOMAIN, JIRA_EMAIL, JIRA_TOKEN);

    await jira.setApps({apps, issueKey: ISSUE_KEY});

    const jiraUser = await jira.findUser({
      displayName: user.name,
      issueKey: ISSUE_KEY,
    });
    if (!jiraUser?.displayName)
      throw new Error(`JIRA account not found for ${user.name}`);


    const { reviewers } = await jira.getTicketDetails(ISSUE_KEY);

    /* if (assignee?.name === jiraUser.displayName) {
      console.log(`${ISSUE_KEY} is already assigned to ${assignee.name}`);
      return;
    }
    await jira.assignUser({ userId: jiraUser.accountId, issueKey: ISSUE_KEY });
    console.log(`${ISSUE_KEY} assigned to ${jiraUser.displayName}`);*/
    console.log(jiraUser);
    const obj: JIRA.PartialUserObj = {};
    if (reviewers) {
      reviewers.forEach((reviewer) => obj[reviewer.accountId] = reviewer);
    }
    obj[jiraUser.accountId] = {
      self: jiraUser.self,
      accountId: jiraUser.accountId,
      accountType: jiraUser.accountType,
      displayName: jiraUser.displayName,
      avatarUrls: jiraUser.avatarUrls,
      active: jiraUser.active,
      timeZone: jiraUser.timeZone
    };
    const users = Object.values(obj);
    await jira.setReviewer({
      users,
      issueKey: ISSUE_KEY
    });
  } catch (error) {
    console.log({ error });
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
