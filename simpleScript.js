(function() {
  // Use the global variables defined in Blogger template
  var items = typeof BLOGGER_COMMENT_ITEMS !== 'undefined' ? BLOGGER_COMMENT_ITEMS : null;
  var msgs = typeof BLOGGER_COMMENT_MSGS !== 'undefined' ? BLOGGER_COMMENT_MSGS : null;
  var config = typeof BLOGGER_COMMENT_CONFIG !== 'undefined' ? BLOGGER_COMMENT_CONFIG : null;
  var postId = typeof BLOGGER_POST_ID !== 'undefined' ? BLOGGER_POST_ID : null;

  // Ensure config and items are available
  if (!config || !postId) {
    console.warn("Blogger comment data is not fully available. Comment system might not function correctly.");
    return;
  }

  var cursor = null;
  if (items && items.length > 0) {
    cursor = parseInt(items[items.length - 1].timestamp) + 1;
  }

  var bodyFromEntry = function(entry) {
    var text = (entry &&
                ((entry.content && entry.content.$t) ||
                 (entry.summary && entry.summary.$t))) ||
               '';
    if (entry && entry.gd$extendedProperty) {
      for (var k in entry.gd$extendedProperty) {
        if (entry.gd$extendedProperty[k].name == 'blogger.contentRemoved') {
          return '<span class="deleted-comment">' + text + '</span>';
        }
      }
    }
    return text;
  }

  var parse = function(data) {
    cursor = null;
    var comments = [];
    if (data && data.feed && data.feed.entry) {
      for (var i = 0, entry; entry = data.feed.entry[i]; i++) {
        var comment = {};
        // comment ID, parsed out of the original id format
        var id = /blog-(\d+).post-(\d+)/.exec(entry.id.$t);
        comment.id = id ? id[2] : null;
        comment.body = bodyFromEntry(entry);
        comment.timestamp = Date.parse(entry.published.$t) + '';
        if (entry.author && entry.author.constructor === Array) {
          var auth = entry.author[0];
          if (auth) {
            comment.author = {
              name: (auth.name ? auth.name.$t : undefined),
              profileUrl: (auth.uri ? auth.uri.$t : undefined),
              avatarUrl: (auth.gd$image ? auth.gd$image.src : undefined)
            };
          }
        }
        if (entry.link) {
          if (entry.link[2]) {
            comment.link = comment.permalink = entry.link[2].href;
          }
          if (entry.link[3]) {
            var pid = /.*comments\/default\/(\d+)\?.*/.exec(entry.link[3].href);
            if (pid && pid[1]) {
              comment.parentId = pid[1];
            }
          }
        }
        comment.deleteclass = 'item-control blog-admin';
        if (entry.gd$extendedProperty) {
          for (var k in entry.gd$extendedProperty) {
            if (entry.gd$extendedProperty[k].name == 'blogger.itemClass') {
              comment.deleteclass += ' ' + entry.gd$extendedProperty[k].value;
            } else if (entry.gd$extendedProperty[k].name == 'blogger.displayTime') {
              comment.displayTime = entry.gd$extendedProperty[k].value;
            }
          }
        }
        comments.push(comment);
      }
    }
    return comments;
  };

  var paginator = function(callback) {
    if (hasMore()) {
      var url = config.feed + '?alt=json&v=2&orderby=published&reverse=false&max-results=50';
      if (cursor) {
        url += '&published-min=' + new Date(cursor).toISOString();
      }
      window.bloggercomments = function(data) {
        var parsed = parse(data);
        cursor = parsed.length < 50 ? null
            : parseInt(parsed[parsed.length - 1].timestamp) + 1
        callback(parsed);
        window.bloggercomments = null;
      }
      url += '&callback=bloggercomments';
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
  };
  var hasMore = function() {
    return !!cursor;
  };
  var getMeta = function(key, comment) {
    if ('iswriter' == key) {
      var matches = !!comment.author
          && comment.author.name == config.authorName
          && comment.author.profileUrl == config.authorUrl;
      return matches ? 'true' : '';
    } else if ('deletelink' == key) {
      return config.baseUri + '/comment/delete/'
          + config.blogId + '/' + comment.id;
    } else if ('deleteclass' == key) {
      return comment.deleteclass;
    }
    return '';
  };

  var replybox = null;
  var replyUrlParts = null;
  var replyParent = undefined;

  var onReply = function(commentId, domId) {
    if (replybox == null) {
      // lazily cache replybox, and adjust to suit this style:
      replybox = document.getElementById('comment-editor');
      if (replybox != null) {
        replybox.height = '250px';
        replybox.style.display = 'block';
        replyUrlParts = replybox.src.split('#');
      }
    }
    if (replybox && (commentId !== replyParent)) {
      replybox.src = '';
      document.getElementById(domId).insertBefore(replybox, null);
      replybox.src = replyUrlParts[0]
          + (commentId ? '&parentID=' + commentId : '')
          + '#' + replyUrlParts[1];
      replyParent = commentId;
    }
  };

  var hash = (window.location.hash || '#').substring(1);
  var startThread, targetComment;
  if (/^comment-form_/.test(hash)) {
    startThread = hash.substring('comment-form_'.length);
  } else if (/^c[0-9]+$/.test(hash)) {
    targetComment = hash.substring(1);
  }

  // Configure commenting API:
  var configJso = {
    'maxDepth': config.maxThreadDepth
  };
  var provider = {
    'id': postId, // Use the global postId variable
    'data': items, // Use the global items variable
    'loadNext': paginator,
    'hasMore': hasMore,
    'getMeta': getMeta,
    'onReply': onReply,
    'rendered': true,
    'initComment': targetComment,
    'initReplyThread': startThread,
    'config': configJso,
    'messages': msgs // Use the global msgs variable
  };

  var render = function() {
    if (window.goog && window.goog.comments) {
      var holder = document.getElementById('comment-holder');
      window.goog.comments.render(holder, provider);
    }
  };

  // render now, or queue to render when library loads:
  if (window.goog && window.goog.comments) {
    render();
  } else {
    window.goog = window.goog || {};
    window.goog.comments = window.goog.comments || {};
    window.goog.comments.loadQueue = window.goog.comments.loadQueue || [];
    window.goog.comments.loadQueue.push(render);
  }
})();
