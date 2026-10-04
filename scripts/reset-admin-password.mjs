// 관리자 비밀번호 재설정 — 운영 DB(Turso)의 관리자 계정 비밀번호를 새로 정한다.
// 사용법: node scripts/reset-admin-password.mjs [아이디]   (아이디 생략 시 admin)
// 새 비밀번호는 터미널에서 직접 입력하며 화면에 표시되지 않는다. .env 의 TURSO_* 값을 사용한다.
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
if (!process.env.TURSO_DATABASE_URL) {
  console.error('.env 에 TURSO_DATABASE_URL 이 없습니다. ./setup.sh 를 먼저 실행하세요.');
  process.exit(1);
}

// 입력 글자를 화면에 전혀 표시하지 않는 비밀번호 입력 (raw 모드로 한 글자씩 읽음)
function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(buf);
          return;
        }
        if (c === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n취소했습니다.\n');
          process.exit(130);
        }
        if (c === '\u007f' || c === '\b') {
          buf = buf.slice(0, -1);
          continue;
        }
        buf += c;
      }
    };
    stdin.on('data', onData);
  });
}

if (!process.stdin.isTTY) {
  console.error('터미널에서 직접 실행하세요 (비밀번호를 화면에 표시하지 않고 입력받습니다).');
  process.exit(1);
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const username = process.argv[2] || 'admin';

const users = await db.execute('SELECT username, role, active FROM users ORDER BY id');
console.log('등록된 계정:', users.rows.map((u) => `${u.username}(${u.role}${u.active ? '' : ', 비활성'})`).join(', '));

const target = users.rows.find((u) => u.username === username);
if (!target) {
  console.error(`'${username}' 계정이 없습니다. 위 목록의 아이디를 인자로 주세요.`);
  process.exit(1);
}

const pw1 = await askHidden(`'${username}' 새 비밀번호(8자 이상): `);
if (pw1.length < 8) {
  console.error('8자 이상이어야 합니다.');
  process.exit(1);
}
const pw2 = await askHidden('한 번 더 입력: ');
if (pw1 !== pw2) {
  console.error('두 비밀번호가 다릅니다.');
  process.exit(1);
}

const hash = await bcrypt.hash(pw1, 10);
const r = await db.execute({ sql: 'UPDATE users SET password_hash = ?, active = 1 WHERE username = ?', args: [hash, username] });
console.log(r.rowsAffected === 1 ? `완료 — '${username}' 비밀번호가 바뀌었습니다. https://simplecube.net/admin/login 에서 로그인하세요.` : '변경된 계정이 없습니다.');
