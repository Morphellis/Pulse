import { describe, expect, test } from 'vitest'
import { stripMentions } from 'actions/detective/common'

describe(stripMentions.name, () => {
  test('упоминание пользователя заменяется именем', () => {
    expect(stripMentions('[id123|Ваня], привет')).toBe('Ваня, привет')
  })

  test('упоминание сообщества тоже раскрывается', () => {
    expect(stripMentions('репост из [club45|Мемы]')).toBe('репост из Мемы')
    expect(stripMentions('[public77|Паблик] топ')).toBe('Паблик топ')
  })

  test('несколько упоминаний в одной строке', () => {
    expect(stripMentions('[id1|А] и [id2|Б] спорят')).toBe('А и Б спорят')
  })

  test('обычный текст не меняется', () => {
    expect(stripMentions('просто текст без ссылок')).toBe('просто текст без ссылок')
    expect(stripMentions('квадратные [скобки] не трогаем')).toBe('квадратные [скобки] не трогаем')
  })
})
