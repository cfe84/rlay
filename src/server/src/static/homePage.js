import { html } from "./html.js"
import { getConnectionStatusAsync, getCallsAsync, patchConnectionStatusAsync } from "./apiConnector.js"

export function homePage({ password }) {

  const connectionStatus = html`<input type="text" class="form-control" disabled placeholder="Status" aria-label="Status" aria-describedby="basic-addon1" value="Unknown"/>`
  const log = html`<tbody></tbody>`
  const refreshButton = html`<button class="btn btn-outline-primary">Refresh</button>`
  const captureLogsCheckbox = html`<input class="form-check-input" type="checkbox" id="capture"/>`
  const captureConfirmation = html`<input type="text" class="form-control" disabled placeholder="Status" aria-label="Status" aria-describedby="basic-addon2" value="Unknown"/>`

  function refreshConnection() {
    getConnectionStatusAsync(password).then(status => {
      connectionStatus.value = status.client.connected ? "🟢 Connected" : "🔴 Disconnected";
      captureConfirmation.value = status.captureLogs ? "🟢 Capturing" : "🔴 Off";
      captureLogsCheckbox.checked = status.captureLogs
    })
  }

  captureLogsCheckbox.onchange = () => {
    const captureLogs = captureLogsCheckbox.checked
    patchConnectionStatusAsync(password, {
      captureLogs
    }).then(refreshConnection)
  }

  function refreshCalls() {
    const children = [...log.children]
    children.forEach(child => log.removeChild(child))
    getCallsAsync(password)
      .then(calls => {
        const str = (a) => `${a}`
        calls.forEach(call => {
          const date = new Date(call.date)
          const row = html`<tr>
  <td>${str(date.toLocaleTimeString())}</td>
  <td>${str(call.request.method)}</td>
  <td>${str(call.request.path)}</td>
  <td>${str(call.response?.statusCode)}</td>
  <td>${str(call.request.body?.length)}</td>
  <td>${str(call.response?.body?.length)}</td>
</tr >
      `
          row.onclick = () => row.className = "active"
          log.appendChild(row)
        })
      })
  }

  function refresh() {
    refreshConnection()
    refreshCalls()
  }

  refresh()
  refreshButton.onclick = refresh

  return html`
<div class="p-4">
  <h1>Rlay status dashboard</h1>
  ${refreshButton}
  <h2>Connection</h2>
  <div class="input-group mb-3">
    <span class="input-group-text" id="basic-addon1">Connection status</span>
    ${connectionStatus}
  </div>
  <div class="input-group mb-3">
    <span class="input-group-text" id="basic-addon2">Log capture</span>
    ${captureConfirmation}
  </div>
  <div class="input-group mb-3">
    ${captureLogsCheckbox}
    <label class="form-check-label" for="capture">
      Capture logs
    </label>
  </div>
  <h2>Call log</h2>
  <div class="table-responsive">
    <table class="table table-striped table-hover table-sm">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Method</th>
          <th scope="col">Path</th>
          <th scope="col">Status</th>
          <th scope="col">Request size</th>
          <th scope="col">Response size</th>
        </tr>
      </thead>
      ${log}
    </table>
  </div>
</div>
      `
}