"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const child = __importStar(require("child_process"));
const utils_1 = require("./utils");
const getInputs = () => {
    const JIRA_TOKEN = core.getInput("jira-token", { required: true });
    const GITHUB_TOKEN = core.getInput("github-token", {
        required: true,
    });
    const JIRA_DOMAIN = core.getInput("jira-domain", {
        required: true,
    });
    const ISSUE_KEY = core.getInput("issue-key", {
        required: true,
    });
    const USERNAME = core.getInput("username", {
        required: true,
    });
    const JIRA_EMAIL = core.getInput("jira-email", {
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
function executeDiff() {
    return __awaiter(this, void 0, void 0, function* () {
        const diffPromise = new Promise((resolve, reject) => {
            child.exec(`git diff --name-only origin/master...${github.context.payload.after}`, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(error || stderr);
                }
                resolve(stdout);
            });
        });
        return diffPromise;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const inputs = getInputs();
            core.debug(`inputs: ${JSON.stringify(inputs, null, 2)}`);
            const { JIRA_TOKEN, GITHUB_TOKEN, JIRA_DOMAIN, ISSUE_KEY, USERNAME, JIRA_EMAIL } = inputs;
            const productsInFile = ["services/app", "services/recruit", "services/superadmin", "services/teamadmin", "services/stats-spots-advanced", "linked_modules/justplay-stats", "services/stats-spots", "linked_modules/justplay-video"];
            const files = yield executeDiff();
            const filesArr = files.split(/\n/);
            console.log(filesArr);
            const productFilesOccurrence = productsInFile.map(p => filesArr.filter(f => f.includes(p)));
            const apps = [];
            productFilesOccurrence[0].length ? apps.push("app") : null;
            productFilesOccurrence[1].length ? apps.push("recruit") : null;
            productFilesOccurrence[2].length ? apps.push("superadmin") : null;
            productFilesOccurrence[3].length ? apps.push("teamadmin") : null;
            productFilesOccurrence[4].length ? apps.push("stats-spots-advanced") : null;
            productFilesOccurrence[5].length ? apps.push("justplay-stats") : null;
            productFilesOccurrence[6].length ? apps.push("stats-spots") : null;
            productFilesOccurrence[7].length ? apps.push("justplay-video") : null;
            console.log(apps);
            // github octokit client with given token
            const octokit = github.getOctokit(GITHUB_TOKEN);
            const username = USERNAME;
            if (!username)
                throw new Error("Cannot find PR owner");
            const { data: user } = yield octokit.users.getByUsername({
                username,
            });
            if (!(user === null || user === void 0 ? void 0 : user.name))
                throw new Error(`User not found: ${USERNAME} ${user === null || user === void 0 ? void 0 : user.name}`);
            const jira = utils_1.getJIRAClient(JIRA_DOMAIN, JIRA_EMAIL, JIRA_TOKEN);
            const jiraUser = yield jira.findUser({
                displayName: user.name,
                issueKey: ISSUE_KEY,
            });
            if (!(jiraUser === null || jiraUser === void 0 ? void 0 : jiraUser.displayName))
                throw new Error(`JIRA account not found for ${user.name}`);
            const { reviewers, products } = yield jira.getTicketDetails(ISSUE_KEY);
            const { pull_request: pullRequest } = github.context.payload;
            console.log(pullRequest, products);
            if (typeof pullRequest === "undefined") {
                const productChange = (apps === null || apps === void 0 ? void 0 : apps.length) > (products === null || products === void 0 ? void 0 : products.length) ? apps : ((products === null || products === void 0 ? void 0 : products.length) ? [...products].filter(p => !apps.includes(p)) : []);
                // throw new Error(`Missing 'pull_request' from github action context.`);
                console.log(productChange);
                if (apps.length && ((productChange === null || productChange === void 0 ? void 0 : productChange.length) || products === null)) {
                    yield jira.setApps({ apps, issueKey: ISSUE_KEY });
                }
            }
            else {
                const obj = {};
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
                yield jira.setReviewer({
                    users,
                    issueKey: ISSUE_KEY
                });
            }
        }
        catch (error) {
            console.log({ error });
            core.setFailed(error.message);
            process.exit(1);
        }
    });
}
run();
