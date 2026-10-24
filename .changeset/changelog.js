import { config } from "dotenv"
import { getCommitInfo, getPullRequestInfo } from "@changesets/get-github-info"

config()

// The user is a plain login instead of a markdown link,
// so Github automatically creates a better link including the user avatar
function toLinks(info) {
  return {
    commit: info?.commit?.markdownLink,
    pull: info?.pull?.markdownLink,
    user: info?.author?.login,
  }
}

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
            const info = await getCommitInfo({
              repo: options.repo,
              commit: cs.commit,
            })
            return info?.commit.markdownLink ?? `\`${cs.commit.slice(0, 7)}\``
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
        const links = toLinks(
          await getPullRequestInfo({
            repo: options.repo,
            pull: prFromSummary,
          }),
        )
        if (commitFromSummary) {
          const shortCommitId = commitFromSummary.slice(0, 7)
          links.commit = `[\`${shortCommitId}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`
        }
        return links
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit
      if (commitToFetchFrom) {
        return toLinks(
          await getCommitInfo({
            repo: options.repo,
            commit: commitToFetchFrom,
          }),
        )
      }
      return toLinks(undefined)
    })()

    const userAts = usersFromSummary.length
      ? usersFromSummary.map((userFromSummary) => `@${userFromSummary}`).join(", ")
      : links.user && `@${links.user}`

    const pr = links.pull == null ? "" : ` (${links.pull})`
    const users = userAts == null ? "" : ` - Thanks ${userAts}`

    return `\n\n- ${firstLine}${pr}${users}\n${futureLines
      .map((l) => `  ${l}`)
      .join("\n")}`
  },
}

export default changelogFunctions
