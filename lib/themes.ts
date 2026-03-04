export const THEMES = [
  { id: "ultraman", label: "奥特曼" },
  { id: "peppa", label: "小猪佩奇" },
  { id: "paw-patrol", label: "汪汪队" },
  { id: "dinosaur", label: "恐龙" },
  { id: "ocean", label: "海洋" },
  { id: "space", label: "太空" },
  { id: "farm", label: "农场" },
  { id: "vehicles", label: "交通工具" },
  { id: "food", label: "水果食物" },
  { id: "ice-princess", label: "冰雪公主" },
  { id: "superhero", label: "超级英雄" },
  { id: "egg-party", label: "蛋仔派对" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

/**
 * themeId -> 英文描述，用于图片生成 prompt
 */
export const THEME_IMAGE_PROMPTS: Record<ThemeId, string> = {
  ultraman: "Ultraman-style superhero, action hero, light beams, cartoon",
  peppa: "Peppa Pig style, cute pig family, cartoon, mud puddles",
  "paw-patrol": "Paw Patrol style, rescue dogs, cartoon, adventure",
  dinosaur: "friendly dinosaurs, prehistoric, cartoon, cute",
  ocean: "underwater ocean, sea creatures, fish, coral, cartoon",
  space: "space, astronauts, rockets, planets, cartoon",
  farm: "farm animals, barn, countryside, cartoon",
  vehicles: "cars, trains, planes, boats, cartoon",
  food: "fruits, vegetables, food, kitchen, cartoon",
  "ice-princess": "ice princess, snow, castle, magical, cartoon",
  superhero: "superhero, cape, flying, cartoon, kid-friendly",
  "egg-party": "egg character style, cute round shapes, cartoon, game-like",
};
