import {getSocketIO} from './socketServer';
import {SOCKET_EVENTS} from './socketEvents';

class SocketEmitter {
  emitGlobalCount(totalCount: number) {
    getSocketIO().emit(SOCKET_EVENTS.GLOBAL_COUNT_UPDATED, {
      totalCount,
    });
  }

  emitBaanalingamUpdated(payload?: Record<string, any>) {
    try {
      getSocketIO().emit(SOCKET_EVENTS.BAANALINGAM_UPDATED, payload || {});
    } catch {
      // Socket may not be ready during early boot.
    }
  }
}

export default new SocketEmitter();
