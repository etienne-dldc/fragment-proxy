import { createFragmentFactory, createTrackFactory, connect } from './lib';
import { Post, PostComment, State, state } from './state';
import { PATHS } from './lib/proxify';

const fragment = createFragmentFactory<State>(state);
const track = createTrackFactory<State>(state);

console.log(state);

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
