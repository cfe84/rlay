import { html } from "./html.js"
import { loginAsync } from "./apiConnector.js"
import { account } from "./account.js"

export function loginPage({
  onLogin
}) {

  const loginButton = html`<button class="w-100 btn btn-lg btn-primary">Sign in</button>`
  const errorDiv = html`<div class="invalid-feedback" style="display: none">Invalid password</div>`
  const passwordInput = html`<input type="password" class="form-control" placeholder="Password" />`
  const rememberMeCheckbox = html`<input type="checkbox" value="remember-me" id="check-remember" />`

  loginButton.onclick = () => {
    const pwd = passwordInput.value
    const remember = rememberMeCheckbox.checked
    loginAsync(pwd).then(() => {
      const acnt = account(pwd)
      if (remember) {
        acnt.save()
      }
      onLogin(acnt)
    }).catch(err => {
      errorDiv.style.display = "block"
      errorDiv.innerHTML = err.message
      return
    })
  }

  return html`
<main id="div-login" class="text-center">

  <div class="form-signin mx-auto p-4" style="width: 300px">
    <h1 class="h3 mb-3 fw-normal">Please enter the server password</h1>

    <div class="form-floating">
      ${passwordInput}
      <label for="input-password">Password</label>
      ${errorDiv}
    </div>
    <div class="checkbox mb-3">
      <label>
        ${rememberMeCheckbox} Remember me
      </label>
    </div>
    ${loginButton}
  </div>

</main>
`
}