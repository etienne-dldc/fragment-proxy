import { FramentsManager } from './lib';
import { state as rawState, State, Post, PostComment } from './state';
import { notNill } from './lib/utils';

const manager = new FramentsManager<State>(rawState);

const post = manager.fragment('post', (state, postId: string) => {
  return notNill(state.posts.find(p => p.id === postId));
});

const selectedPost = manager.fragment('selectedPost', state => post(state.selectedPostId));

const selectedPostComments = manager.fragment('selectedPostComments', state => {
  return selectedPost().comments.map(commentId => {
    return notNill(state.comments.find(comment => comment.id === commentId));
  });
});

const somePosts = manager.fragment('somePosts', () => ({
  first: post('1'),
  second: post('2'),
  third: post('3').title,
}));

const combined = manager.fragment('combined', (state, input: { first: string; second: string }) => {
  const result = {
    selected: selectedPostComments(),
    selectedBis: selectedPostComments(),
    keys: Object.keys(state),
    somePosts: somePosts(),
    thePost: post(input.first),
    theSecondPost: post(input.second),
  };
  return result;
});

const selectedFromCombined = manager.fragment('selectedFromCombined', () => {
  return combined({ first: '1', second: '2' }).selected;
});

const someString = manager.fragment('someString', () => {
  const selected = selectedFromCombined();
  if (selected.length === 0) {
    return 'yolo';
  }
  return selected[0].id + combined({ first: '1', second: '2' }).keys[0];
});

const resolveStuff = manager.createResolve('resolveStuff', combined);

const result = resolveStuff({ first: '6', second: '7' });

console.log(result);

console.log('===========');

console.log(resolveStuff({ first: '5', second: '6' }));

console.log(manager);

/*

const postsFrag = fragment('postsFrag', state => state.posts);
const postsLengthFrag = fragment('postsLengthFrag', state => state.posts.length, length => length + 5);

const result = connect(
  'result',
  {},
  () => ({ posts: postsFrag(), postLength: postsLengthFrag() })
);

console.log(result);

const firstPostsFrag = fragment('postsFrag', state => state.posts[0]);

const commentFrag = fragment(
  'commentFrag',
  (state, commentId: string) => state.comments.find(comment => comment.id === commentId).content
);

const result2 = connect(
  'result2',
  {},
  () => ({ comments: commentFrag('5'), firstPost: firstPostsFrag() })
);

console.log(result2);

// ======

const selectedCommentIdFrag = fragment('selectedCommentIdFrag', state => state.selectedCommentId);

const commentTrack = track('commentTrack', (state, commentId: string) =>
  state.track.comments.find(comment => comment.id === commentId)
);

const selectedCommentTrack = track(
  'selectedCommentTrack',
  state => state.track.selectedCommentId,
  selectedId => commentTrack(selectedId.value)
);

const result3 = connect(
  'result3',
  {},
  () => ({ selectedComment: selectedCommentTrack() })
);

console.log(result3);

// =====

const postCommentsTrack = track('postCommentsTrack', (state, post: Post) =>
  post.comments.map(commentId => commentTrack(commentId))
);

const postTrack = track('postTrack', (state, postId: string) => state.track.posts.find(post => post.id === postId));

const postWithCommentsTrack = track(
  'postWithCommentsTrack',
  (state, postId: string) => state.track.posts.find(post => post.id === postId),
  post => {
    return {
      post: post.track,
      comments: postCommentsTrack(post.value),
    };
  }
);

const result4 = connect(
  'result4',
  {},
  () => ({ ...postWithCommentsTrack('2') })
);

console.log(result4);


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
