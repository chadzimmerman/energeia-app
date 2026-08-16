// react-native-draggable-flatlist pulls in Reanimated 4, which initializes native
// worklets on import and cannot run under Jest. Reanimated's own shipped mock
// does not help, because it re-imports the real module.
//
// The drag library is replaced with a plain FlatList. That is deliberate rather
// than a workaround: gesture handling belongs to the library and is tested by its
// authors. What this project owns is which rows render, in what order, and what
// happens when the list is empty, and a FlatList exercises all of it.
jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { FlatList } = require('react-native');

  const DraggableFlatList = ({ data, renderItem, keyExtractor, ...rest }) =>
    React.createElement(FlatList, {
      data,
      keyExtractor,
      renderItem: ({ item, index }) =>
        renderItem({ item, index, drag: () => {}, isActive: false }),
      ...rest,
    });

  return {
    __esModule: true,
    default: DraggableFlatList,
    ScaleDecorator: ({ children }) => children,
  };
});

// Supabase is never reached in tests. Any module that imports the client gets
// this stub, so a missing mock surfaces as an obvious undefined rather than a
// real network call against the production project.
jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn() },
  },
}));
