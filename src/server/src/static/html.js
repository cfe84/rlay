import htm from 'https://unpkg.com/htm@3.1.0/dist/htm.module.js';

function createElement(tag, properties, ...children) {
  try {
    const elt = document.createElement(tag)

    if (properties) {
      Object.keys(properties).forEach(key => {
        let targetKey = key
        if (key === "class") {
          targetKey = "className"
        }
        elt[targetKey] = properties[key]
      })
    }
    children.forEach(child => {
      if (typeof (child) === "string") {
        child = document.createTextNode(child)
      }
      elt.appendChild(child)
    })
    return elt
  }
  catch (err) {
    console.error(`Error creating element: ${err} for tag "${tag}"`)
    return document.createTextNode(tag)
  }
}

export const html = htm.bind(createElement);