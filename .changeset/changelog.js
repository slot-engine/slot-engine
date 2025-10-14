import { config } from "dotenv"
import { getInfo, getInfoFromPullRequest } from "@changesets/get-github-info"

config()

const changelogFunctions = {
  getDependencyReleaseLine: async (changesets, dependenciesUpdated, options) => {
    if (!options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
      )
    }
    if (dependenciesUpdated.length === 0) return ""

    const changesetLink = `- Updated dependencies [${(
      await Promise.all(
        changesets.map(async (cs) => {
          if (cs.commit) {
            let { links } = await getInfo({
              repo: options.repo,
              commit: cs.commit,
            })
            return links.commit
          }
        }),
      )
    )
      .filter((_) => _)
      .join(", ")}]:`

    const updatedDepenenciesList = dependenciesUpdated.map(
      (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
    )

    return [changesetLink, ...updatedDepenenciesList].join("\n")
  },
  getReleaseLine: async (changeset, type, options) => {
    if (!options || !options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
      )
    }

    let prFromSummary
    let commitFromSummary
    let usersFromSummary = []

    const replacedChangelog = changeset.summary
      .replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
        let num = Number(pr)
        if (!isNaN(num)) prFromSummary = num
        return ""
      })
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit
        return ""
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
        usersFromSummary.push(user)
        return ""
      })
      .trim()

    const [firstLine, ...futureLines] = replacedChangelog
      .split("\n")
      .map((l) => l.trimRight())

    const links = await (async () => {
      if (prFromSummary !== undefined) {
        let { links } = await getInfoFromPullRequest({
          repo: options.repo,
          pull: prFromSummary,
        })
        if (commitFromSummary) {
          const shortCommitId = commitFromSummary.slice(0, 7)
          links = {
            ...links,
            commit: `[\`${shortCommitId}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`,
          }
        }
        return links
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit
      if (commitToFetchFrom) {
        let { links } = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        })
        return links
      }
      return {
        commit: null,
        pull: null,
        user: null,
      }
    })()

    // The user returned from getInfo and getInfoFromPullRequest
    // is in the format of `[@${user.login}](${user.url})`
    // but we don't want a markdown link, so Github automatically
    // creates a better link including the user avatar
    function getSingleUserAt() {
      const user = links.user
      const regex = /\[([^\]]+)\]/
      const match = user.match(regex)
      if (match) {
        return match[1]
      } else {
        return user.replace(/\[([^\]]+)\]\(.*\)/, "$1")
      }
    }

    const userAts = usersFromSummary.length
      ? usersFromSummary.map((userFromSummary) => `@${userFromSummary}`).join(", ")
      : getSingleUserAt()

    const pr = links.pull === null ? "" : ` (${links.pull})`
    const users = userAts === null ? "" : ` - Thanks ${userAts}`

    return `\n\n- ${firstLine}${pr}${users}\n${futureLines
      .map((l) => `  ${l}`)
      .join("\n")}`
  },
}

export default changelogFunctions
