function sendQueryAsync(url, method = "GET", body = undefined, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status < 400) {
          const response = JSON.parse(this.responseText)
          resolve(response)
        } else {
          reject(Error(this.responseText))
        }
      }
    }
    request.open(method, `/rlay/${url}`, true)
    Object.keys(headers).forEach(header => {
      request.setRequestHeader(header, headers[header])
    })
    if (body) {
      request.setRequestHeader("content-type", "application/json")
    }
    request.send(body ? JSON.stringify(body) : undefined)
  })
}

export async function getCallsAsync(password) {
  return await sendQueryAsync("calls", "GET", undefined, { password })
}

export async function getConnectionStatusAsync(password) {
  return await sendQueryAsync("state", "GET", undefined, { password })
}

export async function patchConnectionStatusAsync(password, state) {
  return await sendQueryAsync("state", "PATCH", state, { password })
}

export async function loginAsync(password) {
  return await sendQueryAsync("login", "GET", undefined, { password })
}