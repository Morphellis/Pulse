import { describe, expect, test } from 'vitest'
import { isWebUrl } from '../shared'

describe('isWebUrl', () => {
  test('обычные ссылки пропускаются', () => {
    expect(isWebUrl('https://vk.com/im')).toBe(true)
    expect(isWebUrl('http://example.com/a?b=1#c')).toBe(true)
    expect(isWebUrl('https://vk.com/doc123_456?hash=abc')).toBe(true)
  })

  test('невеб-схемы отбрасываются', () => {
    /*
      Всё это могло прийти ссылкой во вложении сообщения и уехать в openExternal,
      который отдаёт адрес системе целиком — вместе со схемой и её обработчиком
    */
    expect(isWebUrl('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(isWebUrl('javascript:alert(1)')).toBe(false)
    expect(isWebUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isWebUrl('ms-msdt:/id')).toBe(false)
    expect(isWebUrl('smb://attacker/share')).toBe(false)
    expect(isWebUrl('vbscript:msgbox(1)')).toBe(false)
  })

  test('мусор вместо адреса не роняет проверку', () => {
    expect(isWebUrl('')).toBe(false)
    expect(isWebUrl('не ссылка')).toBe(false)
    expect(isWebUrl('//vk.com')).toBe(false)
    expect(isWebUrl('\\\\attacker\\share')).toBe(false)
  })
})
