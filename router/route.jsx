import Url from './url'
import {
  ROUTER_TYPE_KEY_HASH,
  ROUTER_TYPE_KEY_HISTORY,
  ROUTER_CHANGE_EVENT,
  ROUTER_CHANGE_FINISH_EVENT
} from './constant'
import Events from 'mona-events'
import Router from './index'

class Route extends Events {
  setConfig (routeConfig) {
    this.routeConfig = Object.assign({
      type: ROUTER_TYPE_KEY_HASH,
      isHistory: routeConfig.type === ROUTER_TYPE_KEY_HISTORY // 限定死了hash 和history
    }, routeConfig)

    Router.routeConfig = this.routeConfig

    this.format()

    const { isHistory } = this.routeConfig
    if (isHistory) {
      window.addEventListener('popstate', this.format.bind(this), false)
    } else {
      window.addEventListener('hashchange', this.format.bind(this), false)
    }
  }

  // 核心处理逻辑
  format () {
    const { isHistory, index } = this.routeConfig
    let url
    if (isHistory) {
      url = new Url(window.location.href)
    } else {
      let p = window.location.hash.substring(1)
      if (p.charAt(0) !== '/') {
        p = '/' + p
      }
      url = new Url(p)
    }
    const routePath = url.pathname.length > 1 ? url.pathname.substring(1) : index
    const routeInfo = this.matchRoute(routePath)

    // TODO 添加404捕获事件
    if (!routeInfo) {
      throw new Error('Miss route info, 404.')
    }

    const params = Url.parseParam(url.search)
    this.current = Object.assign({}, routeInfo, {
      routePath: routePath,
      params: Object.assign({}, params, routeInfo.params),
      url: url
    })
    Router.current = this.current
    this.emit(ROUTER_CHANGE_EVENT, this.current)
  }

  parseStrToRegExp (str) {
    let params = []
    let reg = str.replace(/\/\:([^\/]+)/g, (t, k) => {
      params.push(k)
      return '/([^\/]*)'
    })
    return {
      regExp: new RegExp('^' + reg + '$'),
      params: params
    }
  }

  matchRoute (path) {
    if (!this.routeInfo) {
      this.routeInfo = []
      this.routeConfig.routeList.forEach((ri) => {
        const keys = Object.keys(ri.routes)
        this.routeInfo = this.routeInfo.concat(keys.map((v) => {
          const info = {
            layout: ri.layout,
            path: v,
            page: ri.routes[v]
          }
          return Object.assign(info, this.parseStrToRegExp(v))
        }))
      })
    }

    Router.routeInfo = this.routeInfo
    for (let i = 0; i < this.routeInfo.length; i++) {
      let regInfo = this.routeInfo[i].regExp.exec(path)
      if (regInfo) {
        let paramData = regInfo.slice(1)
        let params = {}
        this.routeInfo[i].params.forEach((v, j) => {
          params[v] = paramData[j]
        })
        let routeInfo = Object.assign({}, this.routeInfo[i], {
          routePath: path,
          params: params
        })
        if (this.routeConfig.isHistory) {
          routeInfo.state = window.history.state
        }
        return routeInfo
      }
    }
    return false
  }

  changeFinish () {
    this.emit(ROUTER_CHANGE_FINISH_EVENT)
  }

  switchPage (path, data, title = '', state = {}) {
    const { isHistory, baseUrl } = this.routeConfig
    if (isHistory) {
      window.history.replaceState(state, title, '/' + baseUrl + '/' + path + (data ? '?' + Url.param(data) : ''))
      this.format()
    } else {
      window.location.replace('#' + path + (data ? '?' + Url.param(data) : ''))
    }
  }

  href (path, data) {
    const { isHistory, baseUrl } = this.routeConfig
    if (isHistory) {
      return '/' + baseUrl + '/' + path + (data ? '?' + Url.param(data) : '')
    } else {
      return '#' + path + (data ? '?' + Url.param(data) : '')
    }
  }
}

export default new Route
