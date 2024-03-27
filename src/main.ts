import * as core from '@actions/core'
import { wait } from './wait'
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

interface PRUserData {
  id: number
  label_names: string[]
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')

    // Open test
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    const owner = process.env.OWNER || 'deresmos'
    const repo = process.env.REPO || 'test-action'

    const pull_requests = await getMergedPullRequests(owner, repo)
    core.debug(`Pull requests: ${JSON.stringify(pull_requests)}`)
    const pr_by_assignee = pull_requests.reduce(
      (acc, pr) => {
        core.debug(`${JSON.stringify(acc)}`)
        const assignee = pr.assignee?.login
        if (assignee) {
          let data: PRUserData = {
            id: pr.id,
            label_names: pr.labels.map(label => label.name)
          }
          acc[assignee] = (acc[assignee] || []).concat(data)
        }
        return acc
      },
      {} as Record<string, PRUserData[]>
    )
    core.debug(`Filtered pr: ${JSON.stringify(pr_by_assignee)}`)

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getMergedPullRequests(owner: string, repo: string) {
  const response = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc'
  })

  // マージされたPull Requestsのみをフィルターする
  const mergedPullRequests = response.data.filter(pr => pr.merged_at !== null)
  return mergedPullRequests
}
