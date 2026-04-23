"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJIRAClient = void 0;
const axios_1 = __importDefault(require("axios"));
const getJIRAClient = (domain, email, token) => {
    const baseURL = `https://${domain}`;
    const client = axios_1.default.create({
        baseURL: `https://${domain}/rest/api/3`,
        timeout: 2000,
        headers: { Authorization: `Basic ${new Buffer(`${email}:${token}`).toString('base64')}` },
    });
    const findUser = ({ displayName, issueKey, }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const projectKey = issueKey.split("-")[0];
            const lastName = displayName.split(" ").slice(-1)[0].toLowerCase();
            const { data } = yield client.get(`/user/assignable/multiProjectSearch?query=${lastName}&projectKeys=${projectKey}`);
            return data === null || data === void 0 ? void 0 : data[0];
        }
        catch (e) {
            throw e;
        }
    });
    const assignUser = ({ userId, issueKey }) => __awaiter(void 0, void 0, void 0, function* () {
        yield client.put(`issue/${issueKey}/assignee`, {
            accountId: userId,
        });
    });
    const setReviewer = ({ users, issueKey }) => __awaiter(void 0, void 0, void 0, function* () {
        yield client.put(`issue/${issueKey}`, {
            fields: {
                customfield_10052: users
            }
        });
    });
    const getIssue = (id) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const response = yield client.get(`/issue/${id}?fields=project,summary,issuetype,labels,status,customfield_10052,customfield_10043`);
            return response.data;
        }
        catch (e) {
            throw e;
        }
    });
    const getTicketDetails = (key) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const issue = yield getIssue(key);
            const { fields: { assignee, issuetype: type, project, summary, customfield_10016: estimate, customfield_10052: reviewers, customfield_10043: products, labels: rawLabels, status: issueStatus, }, } = issue;
            const labels = rawLabels.map((label) => ({
                name: label,
                url: `${baseURL}/issues?jql=${encodeURIComponent(`project = ${project.key} AND labels = ${label} ORDER BY created DESC`)}`,
            }));
            return {
                key,
                summary,
                url: `${baseURL}/browse/${key}`,
                status: issueStatus.name,
                type: {
                    name: type.name,
                    icon: type.iconUrl,
                },
                assignee,
                project: {
                    name: project.name,
                    url: `${baseURL}/browse/${project.key}`,
                    key: project.key,
                },
                reviewers,
                estimate: typeof estimate === "string" || typeof estimate === "number"
                    ? estimate
                    : "N/A",
                labels,
                products
            };
        }
        catch (e) {
            throw e;
        }
    });
    const setApps = ({ apps, issueKey }) => __awaiter(void 0, void 0, void 0, function* () {
        yield client.put(`issue/${issueKey}`, {
            fields: {
                customfield_10043: apps
            }
        });
    });
    return {
        client,
        getTicketDetails,
        getIssue,
        findUser,
        assignUser,
        setReviewer,
        setApps
    };
};
exports.getJIRAClient = getJIRAClient;
