export const ControlType = Object.freeze({
  Color: "Color",
  Font: "Font",
})

export function addPropertyControls(Component, controls) {
  Component.__framerPropertyControls = controls
}
