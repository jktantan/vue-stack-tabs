import { createI18n } from 'vue-i18n-lite'

export default () => {
  // 引入lang目录下文件
  // 此处使用了 VITE 的 import.meta.globEager。非 VITE 的 可以使用 require.context
  const modules = import.meta.glob('./lang/*', { eager: true })

  /**
   * 获取所有语言文件
   * @param {Object} mList
   */
  function getLangFiles(mList: any, msg: any) {
    for (const path in mList) {
      if (mList[path].default) {
        //  获取文件名
        const pathName = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))

        if (msg[pathName]) {
          msg[pathName] = {
            ...mList[pathName],
            ...mList[path].default
          }
        } else {
          msg[pathName] = mList[path].default
        }
      }
    }
  }

  /**
   * 注册i18n实例并引入语言文件
   */
  // const i18n = createI18n({
  //   fallbackLocale: 'zh-CN',
  //   // 定义默认语言为中文
  //   locale: 'zh-CN',
  //   legacy: false,
  //   // 挂载到全局，不然会报错
  //   // globalInjection: true,
  //   messages: getAllLang(),
  // })
  /**
   * 局部使用i18n
   */
  // const i18n = useI18n({
  //   useScope: 'local',
  //   locale: 'zh-CN',
  //   messages: getAllLang(),
  // })

  // 假设你还有其他目录下的语言文件 它的路径是 src/views/home/locales/en-US.ts
  // 那么你就可以 使用 :lower:（小写） :upper:（大写） 来引入文件
  // const viewModules = import.meta.globEager('../views/**/locales/[[:lower:]][[:lower:]]-[[:upper:]][[:upper:]].ts')

  const allLangs: any = () => {
    const message: any = {}
    getLangFiles(modules, message)
    return message
  }
  // const localeI18n = inject('locales') as { locale: string; messages: object }
  const getI18n = (localeI18n?: any) => {
    let combinateMessage = { ...allLangs() }
    if (!localeI18n) {
      combinateMessage = { ...allLangs(), ...localeI18n.messages }
    }

    return createI18n({
      locale: localeI18n.locale,
      fallbackLocale: 'en',
      messages: combinateMessage
    })
    // const combinateMessage = { ...allLangs(), ...localeI18n.messages }
    // return useI18n({
    //   useScope: 'local',
    //   locale: localeI18n.locale,
    //   messages: combinateMessage
    // })
  }
  return {
    getI18n
  }
}
