import { FramentsManager } from './lib';
import { state as rawState, State, Post, PostComment } from './state';
import { notNill } from './lib/utils';

const manager = new FramentsManager();

type Fragment<Input, Output> = [Input] extends [void] ? () => Output : (input: Input) => Output;

type WithState<Input> = { state: State; input: Input };

function fragment<Input, Output>(name: string, select: (data: WithState<Input>) => Output): Fragment<Input, Output> {
  const frag = manager.fragment(name, select);
  return ((input: Input) => frag({ state: rawState, input })) as any;
}

const selectedPost = fragment<void, Post>('selectedPost', ({ state }) =>
  notNill(state.posts.find(p => p.id === state.selectedPostId))
);

const post = fragment<string, Post>('post', ({ state, input: postId }) => {
  return notNill(state.posts.find(p => p.id === postId));
});

const selectedPostComments = fragment<void, Array<PostComment>>('selectedPostComments', ({ state }) => {
  return selectedPost().comments.map(commentId => {
    return notNill(state.comments.find(comment => comment.id === commentId));
  });
});

const somePosts = fragment<void, { first: Post; second: Post; third: string }>('somePosts', () => ({
  first: post('1'),
  second: post('1'),
  third: post('3').title,
}));

const combined = fragment<void, { selected: Array<PostComment>; keys: Array<string> }>('combined', ({ state }) => {
  const result = {
    selected: selectedPostComments(),
    keys: Object.keys(state),
  };
  return result;
});

const selectedFromCombined = fragment<void, Array<PostComment>>('selectedFromCombined', () => {
  return combined().selected;
});

const someString = fragment<void, string>('someString', () => {
  const selected = selectedFromCombined();
  if (selected.length === 0) {
    return 'yolo';
  }
  return selected[0].id + combined().keys[0];
});

const resolveSomePosts = manager.createResolve('result1', somePosts);

console.log(resolveSomePosts());
manager.logFragState();

console.log('===========');

console.log(resolveSomePosts());
manager.logFragState();

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
