var Hook = require('./Hook');


/** A Widget models a set of controls on a website.
*/
module.exports = function widgetInitWithinDriver(driver) { // TODO: improve this awful, temporary architecture
	return new Class({
		/**
		*@param	name	Name of this widget.
		*@param	values	A hash with the following form:
		*	`elements`: a hash mapping attribute names to a hook. A hook is a one-pair hash mapping a selector type to an actual selector.
		*	a series of methods definitions, i.e. `name: function name(…) { … }`, that will be made available
		*/
		initialize: function init(name, values) {
			this.name = name;
			
			Object.each(values.elements, function(typeAndSelector, key) {
				var hook = new Hook(typeAndSelector, driver);
				this.__defineGetter__(key, hook.toSeleniumElement.bind(hook));
				this.__defineSetter__(key, hook.handleInput.bind(hook));
			}, this);
			
			delete values.elements;
			
			Object.each(values, function(method, key) {
				this[key] = method.bind(this); //TODO: handle elements overloading
			}, this);
		}
	});
}