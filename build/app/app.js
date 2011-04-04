YUI.add('app', function(Y) {


/**
 * Implements a render function for all layers of the application framework.
 * This is used to render not only the views, but also whatever template
 * output that would be used to represent different navigation areas the
 * nav controllers control.  It will invoke a renderer function if there
 * is an attribute defined for this.  This function is supplied a callback
 * that must be executed when render is complete so that renderers can be
 * async.
 * @class RenderTarget
 */
function RenderTarget() {

}

RenderTarget.prototype = {

    /**
     * Executes a function contained in the renderer attribute.  The function
     * receives a callback param that must be executed when the render is
     * complete.  At that time it sets the rendered attribute to true.
     * @method render
     * @param callback {callback} the function to execute after render is
     * complete.
     * @param data passed to the renderer function
     * @context the host object
     */
    render: function(callback, data) {
        var self = this,
            renderer = self.get('renderer');
        if (renderer) {
            renderer.call(self, function() {

                /**
                 * After render has been completed the first time the rendered
                 * attribute is set to true.
                 * @attribute rendered
                 * @type boolean
                 * @default false
                 */
                self.set('rendered', true);

                if (callback) {
                    callback.call(self, data);
                }

            }, data);
        }
    }
};

Y.RenderTarget = RenderTarget;


/**
 * The application framework provides a main application controller
 * that can host multiple navigation controllers, each which can
 * navigate to multiple views and keeps state about where it is
 * in the navigation scheme.  It provides a simple rendering framework
 * that is asynchronous and not DOM focused.  It ties into the
 * history manager to manage the nav state when this feature is
 * available.
 * @module app
 * @since 3.4.0
 * @beta
 */

/**
 * The application control handles the application level
 * functional in the framework.  In addition to hosting
 * the various nav controls for the app, it handles saving
 * state since that needs to be centralized.
 * @class App
 * @constructor
 * @param o The configuration options
 * @extends Base
 * @uses RenderTarget
 */
var DEFAULT = {},
    App = function(o) {
        App.superclass.constructor.apply(this, arguments);
    };

App.NAME = 'App';

App.ATTRS = {

    /**
     * The app control id
     * @attribute id
     * @type string
     */
    id: DEFAULT,

    /**
     * A property that can be used by the navs/views
     * to determine if it is okay to operate.  Not
     * currently modified by the app framework.
     * @attribute modal
     * @type bool
     * @default false
     */
    modal: DEFAULT,

    /**
     * The id of a nav control that has focus
     * Not currently modified by the app framework.
     * @attribute modalFocus
     * @type string
     */
    modalFocus: DEFAULT,

    /**
     * A function used to render whatever scaffolding
     * the app control plumbs in.  This might be nothing,
     * or it could be a container for the various app
     * controls.
     * @attribute renderer
     * @type function
     */
    renderer: DEFAULT
};

Y.extend(App, Y.Base, {

    initializer: function() {

        /**
         * History control instance
         * @property history
         */
        this.history = new Y.HistoryHash();

        /**
         * Hash of navigation controls
         * @property navs
         */
        this.navs = {};
    },

    /**
     * Add a nav control instance to this app control
     * @method addNav
     * @param nav {Nav} a nav control to add
     * @return {App} the app control
     * @chainable
     */
    addNav: function(nav) {
        var self = this,
            id = nav.get('id');

        self.navs[id] = nav;
        nav.set('parent', self);

        nav.on('currentViewIdChange', function(e) {
            self.save(nav, nav.getView(e.newVal));
        });

        return nav;
    },

    /**
     * Remove a nav control from this app control instance
     * @method removeNav
     * @param nav {string|Nav} a nav control to remove
     * @return {Nav} the removed nav control
     */
    removeNav: function(nav) {
        var id = nav, removed;
        if (Y.Lang.isObject(nav)) {
            id = nav.get('id');
        }
        delete this.navs[id];
        return removed || nav;
    },

    /**
     * Save the current state of the application.  This happens automatically
     * when a nav controller navigates to a new view, but it can also be
     * called directly if updating the extra state for a view.
     * @method save
     * @property nav {Nav} a navigation control
     * @property view {View} a view control
     * @return {App} The app control
     * @chainable
     */
    save: function(nav, view) {
        if (!view.get('ephemeral')) {
            var xtra = view.get('state'),
                viewval = view.get('id');
            if (xtra) {
                viewval += nav.get('stateDelimeter') + xtra;
            }
            this.history.addValue(nav.get('id'), viewval);
        } else {
        }

        return this;
    }

});

Y.augment(App, Y.RenderTarget);

Y.App = App;


//   Modality control
//   Visibility/focus of nav controllers?
//   State change Orientation change / view size - implementer
//   The app controller is DOM agnostic code for the most part
/**
 * The nav controller keeps track the views for part of an application,
 * and manages the state that is ultimately saved by the app controller.
 * It can navigate to multiple views and can handle the
 * history tasks for managing additional view state.
 * @class Nav
 * @constructor
 * @param o The configuration options
 * @extends Base
 * @uses RenderTarget
 */
var Nav = function(o) {
    Nav.superclass.constructor.apply(this, arguments);
};

Nav.NAME = 'Nav';

Nav.ATTRS = {

    /**
     * The nav control id
     * @attribute id
     * @type string
     */
    id: DEFAULT,

    /**
     * The app control host
     * @attribute parent
     * @type App
     */
    parent: DEFAULT,

    /**
     * The id of the default view.  This is used when navigate()
     * is called without a view specified and there is no saved state.
     * If not specified, the first view registered with this
     * instance becomes the default.
     * @attribute defaultViewId
     * @type string
     */
    defaultViewId: DEFAULT,

    /**
     * The id of the current view.  This is populated when navigate
     * is called, and if called without a view specified it will try
     * to populate this field from the history hash.
     * @attribute currentViewId
     * @type string
     */
    currentViewId: DEFAULT,

    /**
     * Extra state can be stored along with the view, and this is represented
     * in the history hash as viewid|extrastuff by default.  The pipe delimiter
     * is configurable.
     * @attribute stateDelimeter
     * @type string
     */
    stateDelimeter: {
        value: '|'
    },

    /**
     * A function used to render whatever scaffolding
     * the nav control plumbs in.  This might be nothing,
     * or it could be a container for the views it will
     * host.
     * @attribute renderer
     * @type function
     */
    renderer: DEFAULT
};

Y.extend(Nav, Y.Base, {

    initializer: function() {
        var self = this;

        self.views = {};

        Y.on('history:change', function (e) {
            if (e.src === Y.HistoryHash.SRC_HASH) {
                var id = self.get('id'),
                    changed = e.changed[id];
                if (changed) {
                    self.navigate(function(){
                    }, changed.newVal);
                } else if (e.removed.nav) { }
            }
        });

    },

    /**
     * Register a view with this nav control
     * @method addView
     * @param view {View} a view instance
     * @return {Nav} the nav control
     * @chainable
     */
    addView: function(view) {
        var id = view.get('id');
        this.views[id] = view;
        if (!this.get('defaultViewId')) {
            this.set('defaultViewId', id);
        }
        view.set('parent', this);
        return this;
    },

    /**
     * Unregister a view.
     * @method removeView
     * @param {string|View} the view to remove
     * @return {View} the removed view
     */
    removeView: function(view) {
        var id = this.getViewId(view)[0],
            removed = this.getView(view);
        delete this.views[id];
        return removed;
    },

    /**
     * Gets the view name and extra state if provided delimited
     * in the id or view object.
     * @function getViewId
     * @param {view|string} the view string or instance to parse
     * @return Array an array containing the id and state
     */
    getViewId: function(view) {
        var id = view, parts, state;
        if (Y.Lang.isObject(view)) {
            id = view.get('id');
            state = view.get('state');
        }

        parts = id.split(this.get('stateDelimeter'));
        if (!parts[1] && state) {
            parts[1] = state;
        }

        return parts;
    },

    /**
     * Returns the view when supplied a valid view id or instance
     * @method getView
     * @param {view|string} the view string or instance to get
     * @return {View} the view instance.
     */
    getView: function(view) {
        var id = this.getViewId(view)[0];
        return this.views[id];
    },

    /**
     * Navigates to a view.  When the view name isn't supplied, it
     * renders the view that is in the current history state,
     * or the view registered as default -- in that order.  Navigation
     * is handled asynchronously because the view is rendered
     * asynchronously.
     *
     * @method navigate
     * @param {callback} the function to execute when the navigation is complete
     * @param {string|View} the view to navigate to
     * @return {Nav} the nav control instance
     * @chainable
     */
    navigate: function(callback, view) {
        var self = this, saved, parts, cb = callback;

        // when no argument is passed, try to get the current view from history
        if (!view) {
            saved = self.get('parent').history.get(self.get('id'));
        }

        parts = self.getViewId(view ||
                               saved ||
                               self.get('currentViewId') ||
                               self.get('defaultViewId'));

        // no arg: use the current view if available or the default view
        view = self.getView(parts[0]);

        // We allow the additional arbitrary state via the view|data format
        // supported by this instance.
        if (parts[1]) {
            view.set('state', parts[1]);
        }


        view.render(function() {
            self.set('currentViewId', view.get('id'));
            if (cb) {
                cb.call(self, view);
            }
        }, parts[1]);
    }

});

Y.augment(Nav, Y.RenderTarget);

Y.Nav = Nav;

/**
 * The view class holds the configuration for a given view and handles the
 * rendering of the view. It also holds onto any extra state an implementer
 * wants to keep with the view.
 * @class View
 * @constructor
 * @param o The configuration options
 * @extends Base
 * @uses RenderTarget
 */
var View = function(o) {
        View.superclass.constructor.apply(this, arguments);
    };

View.NAME = 'View';

View.ATTRS = {

    /**
     * The view id
     * @attribute id
     * @type string
     */
    id: DEFAULT,

    /**
     * The nav controller host
     * @attribute parent
     * @type Nav
     */
    parent: DEFAULT,

    /**
     * A configuration to help the nav controller or the view to
     * add a header nav to the content
     * @attribute header
     */
    header: DEFAULT, // header/footer are used by the nav control for navbar

    /**
     * A configuration to help the nav controller or the view to
     * add a nav footer to the content
     * @attribute footer
     */
    footer: DEFAULT, // you could define any property for this, however

    /**
     * This function must be supplied by the implementer to render the view.
     * The function is executed in the context of the view control, and receives
     * a callback and possibly a data payload as parameters.  The callback
     * must be executed when the render is complete.  The data payload, if
     * provided, contains extra state data (which populates the state attribute
     * as well).
     * @attribute renderer
     */
    renderer: DEFAULT, // implementer provides the renderer

    /**
     * Extra state that can be stored for a given rendered view.  This
     * can be updated by the implementer and can be saved to the
     * history stack by calling this.parent.parent.save();
     * @attribute state
     */
    state: DEFAULT, // history item is stored as nav.id=view.id|state

    /**
     * If this view is ephemeral (temporary), it will not participate
     * in state persistence.
     */
    ephemeral: { //
        value: false
    }
};

Y.extend(View, Y.Base, {

});

Y.augment(View, Y.RenderTarget);

Y.View = View;



}, '@VERSION@' ,{requires:['base-base','history']});