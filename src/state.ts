export type Post = { id: string; title: string; comments: Array<string> };

export type PostComment = {
  id: string;
  content: string;
};

export type State = {
  posts: Array<Post>;
  comments: Array<PostComment>;
  grid: Array<Array<number>>;
  obj: {
    demo: number;
    str: string;
  };
  selectedCommentId: string;
  selectedPostId: string;
};

const comments: Array<PostComment> = [
  {
    id: '1',
    content: 'Comment 1',
  },
  {
    id: '2',
    content: 'Comment 2',
  },
  {
    id: '3',
    content: 'Comment 3',
  },
  {
    id: '4',
    content: 'Comment 4',
  },
  {
    id: '5',
    content: 'Comment 5',
  },
  {
    id: '6',
    content: 'Comment 6',
  },
  {
    id: '7',
    content: 'Comment 7',
  },
];

const getRandomComments = () =>
  comments
    .map(c => ({ ...c, sort: Math.random() }))
    .sort((l, r) => l.sort - r.sort)
    .filter(p => Math.random() > 0.5)
    .map(p => p.id);

const posts: Array<Post> = [
  {
    id: '1',
    title: 'Post 1',
    comments: getRandomComments(),
  },
  {
    id: '2',
    title: 'Post 2',
    comments: getRandomComments(),
  },
  {
    id: '3',
    title: 'Post 3',
    comments: getRandomComments(),
  },
  {
    id: '4',
    title: 'Post 4',
    comments: getRandomComments(),
  },
];

export const state: State = {
  posts,
  comments,
  selectedCommentId: '3',
  selectedPostId: '2',
  grid: [[0, 1, 3], [0, 1, 3], [0, 1, 3]],
  obj: {
    demo: 42,
    str: 'hello',
  },
};
