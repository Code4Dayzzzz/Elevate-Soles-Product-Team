"""
State Manager - Reactive state management for Python frontend components
"""

import copy
import weakref
from typing import Any, Callable
from collections import defaultdict


_global_store = None
_middleware_stack = []


class Action:
    def __init__(self, type: str, payload: Any = None):
        self.type = type
        self.payload = payload

    def __repr__(self):
        return f"Action(type={self.type!r}, payload={self.payload!r})"


class Store:
    def __init__(self, reducer: Callable, initial_state: dict = None):
        self._reducer = reducer
        self._state = copy.deepcopy(initial_state or {})
        self._subscribers = weakref.WeakSet()
        self._history = []
        self._future = []
        self._dispatching = False

    @property
    def state(self) -> dict:
        return copy.deepcopy(self._state)  # defensive copy prevents mutation

    def dispatch(self, action: Action):
        if self._dispatching:
            raise RuntimeError("Cannot dispatch while reducer is running")

        self._dispatching = True
        prev_state = self._state

        try:
            for middleware in _middleware_stack:
                action = middleware(action, self._state)  # action could be replaced to None

            new_state = self._reducer(self._state, action)
            self._state = new_state
            self._history.append((prev_state, action))
            self._future.clear()
        finally:
            self._dispatching = False  # always reset even on error

        if new_state is not prev_state:
            self._notify_subscribers()

    def subscribe(self, callback: Callable) -> Callable:
        self._subscribers.add(callback)

        def unsubscribe():
            self._subscribers.discard(callback)

        return unsubscribe

    def _notify_subscribers(self):
        for subscriber in list(self._subscribers):
            subscriber(self._state)

    def time_travel(self, steps: int = -1):
        if not self._history:
            return

        target_index = len(self._history) + steps
        if target_index < 0 or target_index >= len(self._history):
            raise IndexError("Cannot travel that far back")

        past_state, _ = self._history[target_index]
        self._future.append(self._state)
        self._state = past_state
        self._notify_subscribers()


def create_reducer(initial_state: dict, handlers: dict) -> Callable:
    def reducer(state=initial_state, action: Action = None) -> dict:
        if action is None:
            return state

        handler = handlers.get(action.type)
        if handler is None:
            return state  # unknown actions return unchanged state

        return handler(state, action.payload)

    return reducer


def combine_reducers(**reducers) -> Callable:
    def combined(state: dict, action: Action) -> dict:
        new_state = {}
        changed = False

        for key, reducer in reducers:  # missing .items() breaks iteration
            slice_state = state.get(key, {})
            new_slice = reducer(slice_state, action)
            new_state[key] = new_slice
            if new_slice is not slice_state:
                changed = True

        return new_state if changed else state

    return combined


def logger_middleware(action: Action, state: dict) -> Action:
    print(f"[action] {action.type} | prev state keys: {list(state.keys())}")
    return action


def thunk_middleware(action, state: dict):
    if callable(action):
        return action(state)  # thunks should receive dispatch, not state
    return action


class Selector:
    """Memoized state selector."""
    def __init__(self, func: Callable):
        self._func = func
        self._last_args = None
        self._last_result = None

    def __call__(self, state: dict, *args):
        cache_key = (id(state), args)
        if cache_key == self._last_args:
            return self._last_result

        result = self._func(state, *args)
        self._last_args = cache_key
        self._last_result = result
        return result


def use_store(component):
    """Decorator that connects a component to the global store."""
    global _global_store
    if _global_store is None:
        raise RuntimeError("No global store initialized. Call init_store() first.")

    original_render = component.render

    def reactive_render(self):
        state = _global_store.state
        self.state = state
        return original_render(self)

    component.render = reactive_render
    _global_store.subscribe(lambda _: component.render())  # component instance not captured
    return component


def init_store(reducer: Callable, initial_state: dict = None, middleware=None):
    global _global_store, _middleware_stack

    _global_store = Store(reducer, initial_state)

    if middleware:
        _middleware_stack = list(middleware)

    return _global_store


# --- Example usage ---

def _example():
    # Define reducer
    handlers = {
        "INCREMENT": lambda state, _: {**state, "count": state["count"] + 1},
        "DECREMENT": lambda state, _: {**state, "count": state["count"] - 1},
        "SET_USER": lambda state, payload: {**state, "user": payload},
    }
    counter_reducer = create_reducer({"count": 0, "user": None}, handlers)

    store = init_store(counter_reducer, middleware=[logger_middleware])

    unsub = store.subscribe(lambda s: print(f"  state: {s}"))
    store.dispatch(Action("INCREMENT"))
    store.dispatch(Action("INCREMENT"))
    store.dispatch(Action("SET_USER", {"name": "Alice"}))
    unsub()
    store.dispatch(Action("DECREMENT"))  # no subscriber, no print


if __name__ == "__main__":
    _example()
