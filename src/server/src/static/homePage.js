import { html } from "./html.js"
import { getConnectionStatusAsync, getCallsAsync, patchConnectionStatusAsync, deleteCallsAsync } from "./apiConnector.js"

export function homePage({ password }) {

  const connectionStatus = html`<input type="text" class="form-control" disabled placeholder="Status" aria-label="Status" aria-describedby="basic-addon1" value="Unknown"/>`
  const log = html`<tbody></tbody>`
  const refreshButton = html`<button class="btn btn-outline-primary">Refresh</button>`
  const cleanupButton = html`<button class="btn btn-outline-danger">Clear log</button>`
  const captureLogsCheckbox = html`<input class="form-check-input" type="checkbox" id="capture"/>`
  const captureConfirmation = html`<input type="text" class="form-control" disabled placeholder="Status" aria-label="Status" aria-describedby="basic-addon2" value="Unknown"/>`
  const requestHeadersTable = html`<tbody></tbody>`
  const responseHeadersTable = html`<tbody></tbody>`

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

  function clearHeaders() {
    const existingHeaders = [...requestHeadersTable.children]
    existingHeaders.forEach(child => requestHeadersTable.removeChild(child))
    const existingResponseHeaders = [...responseHeadersTable.children]
    existingResponseHeaders.forEach(child => responseHeadersTable.removeChild(child))
  }

  function refreshHeaders({ requestHeaders, responseHeaders }) {
    clearHeaders()

    if (requestHeaders) {
      for (let i = 0; i < requestHeaders.length; i += 2) {
        const header = requestHeaders[i]
        const value = requestHeaders[i + 1]
        const r = html`
<tr>
<td>${header}</td>
<td>${value}</td>
</tr>`
        requestHeadersTable.appendChild(r)
      }
    }

    if (responseHeaders) {
      Object.keys(responseHeaders).forEach(header => {
        const value = responseHeaders[header]
        const r = html`
  <tr>
  <td>${header}</td>
  <td>${value}</td>
  </tr>`
        responseHeadersTable.appendChild(r)
      })

    }
  }

  function refreshCalls() {
    clearHeaders()
    const mapStatusToIcon = (status) => {
      if (!status) {
        return "❓"
      } else if (status < 300) {
        return "✔️"
      } else if (status < 400) {
        return "➡️"
      } else if (status < 500) {
        return "⚠️"
      } else {
        return "❌"
      }
    }
    const children = [...log.children]
    children.forEach(child => log.removeChild(child))
    getCallsAsync(password)
      .then(calls => {
        const str = (a) => `${a}`
        let previouslySelected = null
        calls.forEach(call => {
          const date = new Date(call.date)
          const row = html`<tr>
  <td>${str(date.toLocaleTimeString())}</td>
  <td>${str(call.request.method)}</td>
  <td>${str(call.request.path)}</td>
  <td>${mapStatusToIcon(call.response?.statusCode)} ${str(call.response?.statusCode)}</td>
  <td>${str(call.request.body?.length)}</td>
  <td>${str(call.response?.body?.length)}</td>
</tr >
      `
          for (let child of row.children) {
            child.onclick = () => {
              if (previouslySelected) {
                previouslySelected.classList.remove("table-active")
              }
              row.classList.add("table-active")
              previouslySelected = row
              refreshHeaders({
                requestHeaders: call.request?.headers,
                responseHeaders: call.response?.headers,
              })
            }
          }
          log.appendChild(row)
        })
      })
  }

  cleanupButton.onclick = () => {
    deleteCallsAsync(password).then(refreshCalls)
  }

  function refresh() {
    refreshConnection()
    refreshCalls()
  }

  refresh()
  refreshButton.onclick = refresh

  return html`
<div class="p-4 container">
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
  ${cleanupButton}
  <div class="row">
    <div class="table-responsive col-8">
      <table class="table table-hover table-sm">
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
    <div class="table-responsive col-4 bg-secondary bg-opacity-10">
      Request Headers: <br/>
      <table class="table table-striped table-hover table-sm">
        <thead>
        <tr>
          <th scope="col">Header</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      ${requestHeadersTable}
      </table><br/>
      Response Headers: <br/>
      <table class="table table-striped table-hover table-sm">
        <thead>
        <tr>
          <th scope="col">Header</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      ${responseHeadersTable}
      </table>
    </div>
  </div>
</div>
      `
}