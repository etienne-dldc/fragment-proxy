// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"node_modules/is-plain-obj/index.js":[function(require,module,exports) {
'use strict';

var toString = Object.prototype.toString;

module.exports = function (x) {
  var prototype;
  return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};
},{}],"src/lib/proxify.ts":[function(require,module,exports) {
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

exports.__esModule = true;

var is_plain_obj_1 = __importDefault(require("is-plain-obj"));

exports.IS_PROXY = Symbol('IS_PROXY');
exports.IS_TRACKED = Symbol('IS_TRACKED');
exports.PATHS = Symbol('PATHS');
exports.VALUE = Symbol('VALUE');
exports.KEYS = Symbol('KEYS');
var arrayMutations = new Set(['push', 'shift', 'pop', 'unshift', 'splice', 'reverse', 'sort', 'copyWithin']);

function createArrayProxy(value, onLeafAccess, path, paths) {
  return new Proxy(value, {
    get: function get(target, prop) {
      if (prop === exports.IS_PROXY) return true;
      if (prop === exports.PATHS) return paths.concat([path]);
      if (prop === exports.VALUE) return value;

      if (prop === 'length') {
        onLeafAccess(path.concat([exports.KEYS])); // createTracked(target[prop], [...paths, [...path, KEYS]]);

        return target.length;
      }

      if (_typeof(prop) === 'symbol') {
        throw new Error("Not allowed");
      }

      if (typeof target[prop] === 'function') {
        if (arrayMutations.has(String(prop))) {
          throw new Error("Not allowed");
        }

        if (prop === 'find') {
          return function () {
            var args = [];

            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }

            onLeafAccess(path.concat(['find']));
            var result = target[prop].apply(target, args);

            if (result) {
              var index = target.indexOf(result);

              if (index === -1) {
                throw new Error('Whaat ??');
              }

              return proxify(result, onLeafAccess, path.concat([index]), paths);
            }

            return undefined;
          };
        }

        throw new Error("Not supported methof " + prop);
      }

      var nestedPath = path.concat([prop]);
      return proxify(target[prop], onLeafAccess, nestedPath);
    },
    set: function set(target, prop, value) {
      throw new Error("Not allowed");
    }
  });
}

function createObjectProxy(value, onLeafAccess, path, paths) {
  return new Proxy(value, {
    get: function get(target, prop) {
      if (prop === exports.IS_PROXY) return true;
      if (prop === exports.PATHS) return paths.concat([path]);
      if (prop === exports.VALUE) return value;

      if (_typeof(prop) === 'symbol') {
        throw new Error("Not allowed");
      }

      if (prop in Object.prototype) {
        throw new Error("Not allowed");
      }

      var descriptor = Object.getOwnPropertyDescriptor(target, prop);

      if (descriptor && 'get' in descriptor) {
        throw new Error("getter are not supportted");
      }

      var targetValue = target[prop];
      var nestedPath = path.concat([prop]);

      if (typeof targetValue === 'function') {
        throw new Error("function are not supportted");
      }

      return proxify(targetValue, onLeafAccess, nestedPath, paths);
    },
    set: function set(target, prop, value) {
      throw new Error("Not allowed");
    },
    deleteProperty: function deleteProperty(target, prop) {
      throw new Error("Not allowed");
    }
  });
}

function pathEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every(function (v, i) {
    return v === right[i];
  });
}

function isTracked(value) {
  return value && (value[exports.IS_PROXY] || value[exports.IS_TRACKED]);
}

function getTrackedValue(value) {
  if (!isTracked(value)) {
    throw new Error("Not a tracked");
  }

  return value[exports.VALUE];
}

function resolveTracked(value) {
  if (isTracked(value)) {
    return {
      paths: value[exports.PATHS],
      value: value[exports.VALUE]
    };
  }

  if (is_plain_obj_1["default"](value)) {
    var paths_1 = [];
    var resValue_1 = {};
    Object.keys(value).forEach(function (key) {
      var res = resolveTracked(value[key]);
      paths_1.push.apply(paths_1, res.paths);
      resValue_1[key] = res.value;
    });
    return {
      paths: paths_1,
      value: resValue_1
    };
  }

  if (Array.isArray(value)) {
    var paths_2 = [];
    var resValue = value.map(function (val) {
      var res = resolveTracked(val);
      paths_2.push.apply(paths_2, res.paths);
      return res.value;
    });
    return {
      paths: paths_2,
      value: resValue
    };
  }

  throw new Error("Unsuported " + _typeof(value));
}

exports.resolveTracked = resolveTracked;

function proxify(value, onLeafAccess, path, paths) {
  if (path === void 0) {
    path = [];
  }

  if (paths === void 0) {
    paths = [];
  }

  if (value) {
    if (value[exports.IS_PROXY]) {
      if (pathEqual(value[exports.PATHS], path)) {
        // already proxy but not same path => new proxy with correct path
        return proxify(value[exports.VALUE], onLeafAccess, path, paths);
      }

      return value;
    } else if (is_plain_obj_1["default"](value)) {
      return createObjectProxy(value, onLeafAccess, path, paths);
    } else if (Array.isArray(value)) {
      return createArrayProxy(value, onLeafAccess, path, paths);
    }
  }

  onLeafAccess(path);
  return value;
}

exports.proxify = proxify;
},{"is-plain-obj":"node_modules/is-plain-obj/index.js"}],"src/lib/index.ts":[function(require,module,exports) {
"use strict";

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

exports.__esModule = true;

var proxify_1 = require("./proxify");

function stringifyPath(path) {
  return path.map(function (v) {
    return String(v);
  }).join('.');
}

function createFragmentFactory(state) {
  function fragment(name, select) {
    return function (input) {
      var currentFragment = [];
      var proxyState = proxify_1.proxify(state, function (path) {
        currentFragment.push(path);
      });
      console.log("[FRAG] " + name + " start");
      var result = select(proxyState, input);
      var tracked = proxify_1.resolveTracked(result);
      var output = tracked.value;
      console.log({
        tracked: tracked.paths,
        currentFragment: currentFragment
      });
      console.log("[FRAG] " + name + " end");
      return output;
    };
  }

  return fragment;
}

exports.createFragmentFactory = createFragmentFactory;

function createTrackable(value, basePath, paths) {
  var initPath = basePath ? [basePath] : [];
  return {
    value: value,
    track: proxify_1.proxify(value, initPath, paths)
  };
}

function createTrackFactory(state) {
  var proxyState = proxify_1.proxify(state);

  function track(name) {
    var selects = [];

    for (var _i = 1; _i < arguments.length; _i++) {
      selects[_i - 1] = arguments[_i];
    }

    return function (input) {
      console.log("[FRAG] " + name + " start");
      var result = selects.reduce(function (acc, select, index) {
        if (index === 0) {
          return proxify_1.resolveTracked(select(createTrackable(proxyState, null, []), input));
        }

        var res = proxify_1.resolveTracked(select(createTrackable(acc.value, String(index), acc.paths), input));
        return res;
      }, null);
      console.log("[FRAG] " + name + " result", result);
      var output = result.value;
      console.log("[FRAG] " + name + " end");
      return proxify_1.createTracked(output, result.paths);
    };
  }

  return track;
}

exports.createTrackFactory = createTrackFactory;

function connect(name, props, fragment, input) {
  console.log("[CONNECT] " + name + " start");
  var result = {};

  if (fragment) {
    var tracked = proxify_1.resolveTracked(fragment(input));
    tracked.paths.forEach(function (path) {
      console.log("[CONNECT] " + name + " track " + stringifyPath(path));
    });
    result = tracked.value;
  }

  console.log("[CONNECT] " + name + " end");
  return __assign({}, props, result);
}

exports.connect = connect;
},{"./proxify":"src/lib/proxify.ts"}],"src/state.ts":[function(require,module,exports) {
"use strict";

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

exports.__esModule = true;
var comments = [{
  id: '1',
  content: 'Comment 1'
}, {
  id: '2',
  content: 'Comment 2'
}, {
  id: '3',
  content: 'Comment 3'
}, {
  id: '4',
  content: 'Comment 4'
}, {
  id: '5',
  content: 'Comment 5'
}, {
  id: '6',
  content: 'Comment 6'
}, {
  id: '7',
  content: 'Comment 7'
}];

var getRandomComments = function getRandomComments() {
  return comments.map(function (c) {
    return __assign({}, c, {
      sort: Math.random()
    });
  }).sort(function (l, r) {
    return l.sort - r.sort;
  }).filter(function (p) {
    return Math.random() > 0.5;
  }).map(function (p) {
    return p.id;
  });
};

var posts = [{
  id: '1',
  title: 'Post 1',
  comments: getRandomComments()
}, {
  id: '2',
  title: 'Post 2',
  comments: getRandomComments()
}, {
  id: '3',
  title: 'Post 3',
  comments: getRandomComments()
}, {
  id: '4',
  title: 'Post 4',
  comments: getRandomComments()
}];
exports.state = {
  posts: posts,
  comments: comments,
  selectedCommentId: '3',
  selectedPostId: '2',
  grid: [[0, 1, 3], [0, 1, 3], [0, 1, 3]],
  obj: {
    demo: 42,
    str: 'hello'
  }
};
},{}],"src/index.ts":[function(require,module,exports) {
"use strict";

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

exports.__esModule = true;

var lib_1 = require("./lib");

var state_1 = require("./state");

var fragment = lib_1.createFragmentFactory(state_1.state);
var track = lib_1.createTrackFactory(state_1.state);
console.log(state_1.state);
var postsFrag = fragment('postsFrag', function (state) {
  return state.posts;
});
var postsLengthFrag = fragment('postsLengthFrag', function (state) {
  return state.posts.length;
}, function (length) {
  return length + 5;
});
var result = lib_1.connect('result', {}, function () {
  return {
    posts: postsFrag(),
    postLength: postsLengthFrag()
  };
});
console.log(result);
var firstPostsFrag = fragment('postsFrag', function (state) {
  return state.posts[0];
});
var commentFrag = fragment('commentFrag', function (state, commentId) {
  return state.comments.find(function (comment) {
    return comment.id === commentId;
  }).content;
});
var result2 = lib_1.connect('result2', {}, function () {
  return {
    comments: commentFrag('5'),
    firstPost: firstPostsFrag()
  };
});
console.log(result2); // ======

var selectedCommentIdFrag = fragment('selectedCommentIdFrag', function (state) {
  return state.selectedCommentId;
});
var commentTrack = track('commentTrack', function (state, commentId) {
  return state.track.comments.find(function (comment) {
    return comment.id === commentId;
  });
});
var selectedCommentTrack = track('selectedCommentTrack', function (state) {
  return state.track.selectedCommentId;
}, function (selectedId) {
  return commentTrack(selectedId.value);
});
var result3 = lib_1.connect('result3', {}, function () {
  return {
    selectedComment: selectedCommentTrack()
  };
});
console.log(result3); // =====

var postCommentsTrack = track('postCommentsTrack', function (state, post) {
  return post.comments.map(function (commentId) {
    return commentTrack(commentId);
  });
});
var postTrack = track('postTrack', function (state, postId) {
  return state.track.posts.find(function (post) {
    return post.id === postId;
  });
});
var postWithCommentsTrack = track('postWithCommentsTrack', function (state, postId) {
  return state.track.posts.find(function (post) {
    return post.id === postId;
  });
}, function (post) {
  return {
    post: post.track,
    comments: postCommentsTrack(post.value)
  };
});
var result4 = lib_1.connect('result4', {}, function () {
  return __assign({}, postWithCommentsTrack('2'));
});
console.log(result4);
/*

type CommentProps = {
  comment: PostComment;
};

const CommentComponent = (props: CommentProps) => {
  const { comment } = connect(
    'CommentComponent',
    props
  );
};

// Post

type PostProps = {
  postId: string;
};

const commentFrag = fragment('commentFrag', (state, commentId: string) =>
  state.comments.find(comment => comment.id === commentId)
);

const postCommentsFrag = fragment('postCommentsFrag', (state, post: Post) =>
  post.comments.map(commentId => commentFrag(commentId))
);

const postFrag = fragment('postFrag', (state, postId: string) => {
  const post = state.posts.find(post => post.id === postId);
  return {
    post,
    comments: postCommentsFrag(post),
  };
});

const PostComponent = (props: PostProps) => {
  const { comments, post } = connect(
    'PostComponent',
    props,
    postFrag,
    props.postId
  );
  comments.forEach(comment => {
    CommentComponent({ comment });
  });
};

// Posts
type PostsProps = {};

const postsIdsFrag = fragment('postsIdsFrag', state => state.posts.map(post => post.id));

const postsFrag = fragment('postsFrag', () => ({
  postsIds: postsIdsFrag(),
}));

const PostsComponent = (props: PostsProps) => {
  const { postsIds } = connect(
    'PostsComponent',
    props,
    postsFrag
  );

  postsIds.map(postId => {
    PostComponent({ postId });
  });
};

console.log('hello');

// render
PostsComponent({});
*/
},{"./lib":"src/lib/index.ts","./state":"src/state.ts"}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "52838" + '/');

  ws.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      console.clear();
      data.assets.forEach(function (asset) {
        hmrApply(global.parcelRequire, asset);
      });
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          hmrAccept(global.parcelRequire, asset.id);
        }
      });
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAccept(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAccept(bundle.parent, id);
  }

  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAccept(global.parcelRequire, id);
  });
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/index.ts"], null)
//# sourceMappingURL=/src.f10117fe.map