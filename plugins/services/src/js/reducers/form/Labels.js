import {
  ADD_ROW,
  REMOVE_ROW,
  SET
} from '../../../../../../src/js/constants/TransactionTypes';
import Transaction from '../../../../../../src/js/structs/Transaction';
import Util from '../../../../../../src/js/utils/Util';

module.exports = {
  JSONReducer(state, {type, path, value}) {
    if (this.labels == null) {
      this.labels = [];

      if (state != null) {
        this.labels = Object.keys(state).reduce((memo, key) => {
          memo.push({
            key: key.toUpperCase(),
            value: state[key]
          });
          return memo;
        }, []);
      }
    }

    if (path != null && path.join('.').search('labels') !== -1) {
      if (path.join('.') === 'labels') {
        switch (type) {
          case ADD_ROW:
            this.labels.push({key: null, value: null});
            break;
          case REMOVE_ROW:
            this.labels = this.labels.filter((item, index) => {
              return index !== value;
            });
            if (this.labels.length === 0) {
              this.labels.push({key: null, value: null});
            }
            break;
        }

        return this.labels.reduce((memo, item) => {
          if (item.key != null || item.value != null) {
            memo[item.key] = item.value;
          }
          return memo;
        }, {});
      }

      const joinedPath = path.join('.');
      const index = joinedPath.match(/\d+/)[0];
      switch (true) {
        case (type === SET && `labels.${index}.key` === joinedPath):
          this.labels[index].key = value;
          break;
        case (type === SET && `labels.${index}.value` === joinedPath):
          this.labels[index].value = value;
          break;
      }
    }
    return this.labels.reduce((memo, item) => {
      memo[item.key] = item.value;
      return memo;
    }, {});
  },
  JSONParser(state) {
    return Object.keys(state.labels).reduce(function (memo, key, index) {
      memo.push(new Transaction(['labels'], index, ADD_ROW));
      memo.push(new Transaction([
        'labels',
        index,
        'key'
      ], key, SET));
      memo.push(new Transaction([
        'labels',
        index,
        'value'
      ], state.labels[key], SET));

      return memo;
    }, []);
  },
  FormReducer(state = [], {type, path, value}) {
    // Prepare
    // TODO: Remove when we use the parsers
    if (Util.isObject(state) && !Array.isArray(state)) {
      state = Object.keys(state).reduce((memo, key) => {
        memo.push({
          key,
          value: state[key]
        });
        return memo;
      }, []);
    }

    // ROWS
    if (path != null && path.join('.').search('labels') !== -1) {
      if (path.join('.') === 'labels') {
        switch (type) {
          case ADD_ROW:
            state.push({key: null, value: null});
            break;
          case REMOVE_ROW:
            state = state.filter((item, index) => {
              return index !== value;
            });
            break;
        }
        return state;
      }

      // SET
      let joinedPath = path.join('.');
      let index = joinedPath.match(/\d+/)[0];
      switch (true) {
        case (type === SET &&
        `labels.${index}.key` === joinedPath):
          state[index].key = value;
          break;
        case (type === SET &&
        `labels.${index}.value` === joinedPath):
          state[index].value = value;
          break;
      }
    }
    return state;
  }
};
