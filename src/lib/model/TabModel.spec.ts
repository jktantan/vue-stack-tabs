import { describe, it, expect } from 'vitest'
import { Stack } from './TabModel'

describe('Stack', () => {
  it('push 与 peek', () => {
    const s = new Stack<number>()
    s.push(1)
    expect(s.peek()).toBe(1)
    s.push(2)
    expect(s.peek()).toBe(2)
  })

  it('pop 返回栈顶并移除', () => {
    const s = new Stack<string>(['a', 'b'])
    expect(s.pop()).toBe('b')
    expect(s.pop()).toBe('a')
    expect(s.pop()).toBeUndefined()
  })

  it('size 与 isEmpty', () => {
    const s = new Stack<number>()
    expect(s.isEmpty()).toBe(true)
    expect(s.size()).toBe(0)
    s.push(1)
    expect(s.isEmpty()).toBe(false)
    expect(s.size()).toBe(1)
  })

  it('list 返回元素数组', () => {
    const s = new Stack<number>([1, 2, 3])
    expect(s.list()).toEqual([1, 2, 3])
  })

  it('clear 清空栈', () => {
    const s = new Stack<number>([1, 2])
    s.clear()
    expect(s.isEmpty()).toBe(true)
    expect(s.peek()).toBeUndefined()
  })
})
