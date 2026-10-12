/**
 * Lekki helper Mock DOM do testów jednostkowych w czystym Node.js
 * Eliminuje potrzebę instalowania ciężkich zewnętrznych zależności (np. jsdom).
 */

export function setupMockDom(initialHtml = '<!DOCTYPE html><html><body></body></html>') {
  const elements = new Map();
  const listeners = new Map();

  class MockElement {
    constructor(tagName, id = '', className = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.className = className;
      this.classList = {
        _classes: new Set(className ? className.split(' ').filter(Boolean) : []),
        add(...cls) { cls.forEach(c => this._classes.add(c)); },
        remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
        toggle(cls, force) {
          if (typeof force === 'boolean') {
            if (force) this._classes.add(cls);
            else this._classes.delete(cls);
            return force;
          }
          if (this._classes.has(cls)) {
            this._classes.delete(cls);
            return false;
          }
          this._classes.add(cls);
          return true;
        },
        contains(cls) { return this._classes.has(cls); }
      };
      this.attributes = new Map();
      this.style = {};
      this.textContent = '';
      this.innerHTML = '';
      this.children = [];
    }

    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    removeAttribute(k) { this.attributes.delete(k); }
    hasAttribute(k) { return this.attributes.has(k); }
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
    dispatchEvent(evt) {
      const fns = listeners.get(evt.type) || [];
      fns.forEach(fn => fn(evt));
      return true;
    }
    focus() { this._focused = true; }
  }

  const mockDocument = {
    readyState: 'complete',
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement(tag),
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    dispatchEvent: (evt) => {
      const fns = listeners.get(evt.type) || [];
      fns.forEach(fn => fn(evt));
      return true;
    }
  };

  const mockWindow = {
    document: mockDocument,
    innerWidth: 1024,
    innerHeight: 768,
    localStorage: {
      _data: new Map(),
      getItem(k) { return this._data.get(k) || null; },
      setItem(k, v) { this._data.set(k, String(v)); },
      removeItem(k) { this._data.delete(k); },
      clear() { this._data.clear(); }
    },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    addEventListener: (evt, fn) => mockDocument.addEventListener(evt, fn)
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.localStorage = mockWindow.localStorage;

  return { mockWindow, mockDocument, MockElement, elements, listeners };
}
