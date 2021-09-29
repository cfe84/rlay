import { loadSavedAccount } from "./account.js"
import { getCallsAsync } from "./apiConnector.js"
import { homePage } from "./homePage.js"
import { loginPage } from "./loginPage.js"

function app() {
  let component = null
  function render(cmpt) {
    if (component) {
      document.body.removeChild(component)
    }
    document.body.appendChild(cmpt)
    component = cmpt
  }

  const acnt = loadSavedAccount()
  if (!acnt) {
    render(loginPage({ onLogin: (account) => render(homePage(account)) }))
  } else {
    render(homePage(acnt))
  }
}

window.onload = () => {
  app()
}