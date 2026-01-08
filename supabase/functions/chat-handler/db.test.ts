// Test for extractMemories function
import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { extractMemories } from './db.ts';
import type { UserContext } from './types.ts';

Deno.test('extractMemories - 提取兴趣爱好', () => {
  const userContext: UserContext = {
    id: 'test-user-id',
    name: '测试用户',
    age: 10,
    interests: [],
    grade: '五年级',
    avatar_url: '',
    profile: [],
  };

  const userMessage = '我喜欢打篮球和画画';
  const aiResponse = '太好了！篮球和画画都是很棒的爱好。';

  const memories = extractMemories(userMessage, aiResponse, userContext);

  // 应该提取到至少一个记忆
  assertEquals(memories.length > 0, true);
  
  // 检查记忆的基本结构
  if (memories.length > 0) {
    assertEquals(memories[0].user_id, 'test-user-id');
    assertEquals(typeof memories[0].memory_key, 'string');
    assertEquals(typeof memories[0].memory_value, 'string');
    assertEquals(memories[0].importance >= 1 && memories[0].importance <= 10, true);
  }
});

Deno.test('extractMemories - 提取学习相关信息', () => {
  const userContext: UserContext = {
    id: 'test-user-id',
    name: '测试用户',
    age: 10,
    interests: [],
    grade: '五年级',
    avatar_url: '',
    profile: [],
  };

  const userMessage = '我正在学习编程';
  const aiResponse = '编程是一项很有用的技能！';

  const memories = extractMemories(userMessage, aiResponse, userContext);

  assertEquals(memories.length > 0, true);
  
  // 学习相关的记忆应该有较高的重要性
  if (memories.length > 0) {
    assertEquals(memories[0].importance >= 7, true);
  }
});

Deno.test('extractMemories - 提取年龄信息', () => {
  const userContext: UserContext = {
    id: 'test-user-id',
    name: '测试用户',
    age: 10,
    interests: [],
    grade: '五年级',
    avatar_url: '',
    profile: [],
  };

  const userMessage = '我今年12岁了';
  const aiResponse = '12岁正是学习的好时光！';

  const memories = extractMemories(userMessage, aiResponse, userContext);

  // 应该提取到年龄信息（因为与 userContext.age 不同）
  const ageMemory = memories.find(m => m.memory_key.startsWith('age_'));
  assertEquals(ageMemory !== undefined, true);
  
  if (ageMemory) {
    assertEquals(ageMemory.memory_value.includes('12岁'), true);
    assertEquals(ageMemory.importance, 9);
  }
});

Deno.test('extractMemories - 限制返回数量', () => {
  const userContext: UserContext = {
    id: 'test-user-id',
    name: '测试用户',
    age: 10,
    interests: [],
    grade: '五年级',
    avatar_url: '',
    profile: [],
  };

  const userMessage = '我喜欢篮球、足球、游泳、画画、唱歌、跳舞，我正在学习编程、数学、英语';
  const aiResponse = '你的兴趣真广泛！';

  const memories = extractMemories(userMessage, aiResponse, userContext);

  // 应该限制在 5 个记忆以内
  assertEquals(memories.length <= 5, true);
});

Deno.test('extractMemories - 空消息返回空数组', () => {
  const userContext: UserContext = {
    id: 'test-user-id',
    name: '测试用户',
    age: 10,
    interests: [],
    grade: '五年级',
    avatar_url: '',
    profile: [],
  };

  const userMessage = '';
  const aiResponse = '';

  const memories = extractMemories(userMessage, aiResponse, userContext);

  assertEquals(memories.length, 0);
});
