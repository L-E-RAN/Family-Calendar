import type { AssistantContext } from './context'

export function buildSystemPrompt(ctx: AssistantContext): string {
  const lines: string[] = [
    `אתה עוזר משפחתי חכם ומועיל של משפחת ${ctx.familyName}.`,
    `אתה עונה תמיד בעברית, בצורה תמציתית וידידותית.`,
    `אתה לא יכול לשנות נתונים בעצמך — אם המשתמש מבקש פעולת כתיבה, החזר suggestedAction בתגובה.`,
    `אל תמציא נתונים שאינם בהקשר שניתן לך.`,
    '',
    `היום: ${ctx.date}`,
    `שם המשתמש: ${ctx.profileName}`,
    '',
  ]

  if (ctx.todayEvents.length > 0) {
    lines.push('אירועים היום:')
    ctx.todayEvents.forEach(e => lines.push(`- ${e.title} (${e.time})`))
    lines.push('')
  }

  if (ctx.overdueTasks.length > 0) {
    lines.push('משימות באיחור:')
    ctx.overdueTasks.forEach(t => lines.push(`- ${t.title}`))
    lines.push('')
  }

  if (ctx.openShoppingItems.length > 0) {
    lines.push('פריטים ברשימת הקניות:')
    ctx.openShoppingItems.slice(0, 10).forEach(i => lines.push(`- ${i.title}${i.quantity ? ` (${i.quantity})` : ''}`))
    if (ctx.openShoppingItems.length > 10) lines.push(`  ...ו-${ctx.openShoppingItems.length - 10} נוספים`)
    lines.push('')
  }

  if (ctx.petDueItems.length > 0) {
    lines.push('תזכורות חיות מחמד:')
    ctx.petDueItems.forEach(e => lines.push(`- ${e.petName}: ${e.title}`))
    lines.push('')
  }

  if (ctx.warrantyExpiringSoon.length > 0) {
    lines.push('אחריות פגה בקרוב:')
    ctx.warrantyExpiringSoon.forEach(a => lines.push(`- ${a.name} (${a.daysLeft} ימים)`))
    lines.push('')
  }

  if (ctx.maintenanceDueSoon.length > 0) {
    lines.push('משימות תחזוקה:')
    ctx.maintenanceDueSoon.forEach(t => lines.push(`- ${t.title}${t.overdue ? ' (באיחור!)' : ''}`))
    lines.push('')
  }

  return lines.join('\n')
}
