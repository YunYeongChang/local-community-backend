import { model, Schema } from 'mongoose';
import { commentEditLog as editLog } from './recordlog';

const Comment = new Schema({
  timestamp: String,
  target: {
    ispost: {
      type: Boolean,
      default: false
    },
    target: {
      type: Schema.Types.ObjectId
    }
  },
  content: {
    text: String,
    picture: Array
  },
  owner: {
    type: Schema.Types.ObjectId
  },
  modify: {
    ismodified: {
      type: Boolean,
      default: false
    },
    history: [
      editLog
    ]
  },
  suecount: {
    type: Number,
    default: 0
  },
  visible: {
    type: Boolean,
    default: true
  }
}, {
  versionKey: false
});

export default model('comment', Comment );