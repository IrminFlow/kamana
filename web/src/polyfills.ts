// options.js uses Element.replaceChildren (Chrome 86+). Older browsers on old phones need this.
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (this: Element, ...nodes: (Node | string)[]) {
    while (this.lastChild) this.removeChild(this.lastChild);
    this.append(...nodes);
  };
}
