// OPTIONAL synthetic demo fixtures. Run explicitly; never used in production.
import bcrypt from 'bcryptjs';
import { pool, inTransaction } from '../src/db.js';

const password = process.env.DEMO_PASSWORD || 'DemoPassword123!';
console.log(`[seed] Seeding demo staff with DEMO_PASSWORD="${password}"...`);
const hash = await bcrypt.hash(password, 12);
async function ensure(client, table, name, args) {
  let current = await client.query(`SELECT id FROM ${table} WHERE name=$1 LIMIT 1`,[name]);
  if(current.rows[0]) return current.rows[0].id;
  let created = await client.query(args.sql,args.values);
  return created.rows[0].id;
}
try {
  const ids = await inTransaction(async client=>{
    const town = await client.query(
      `SELECT id FROM locations WHERE district_code='CO' AND town='DEMO Maharagama' LIMIT 1`,
    );
    const locationId = town.rows[0]?.id || (await client.query(
      `INSERT INTO locations(district_code,ds_code,town,address_line) VALUES('CO','MAH','DEMO Maharagama','Fictional demo venue — no real address') RETURNING id`,
    )).rows[0].id;
    const hospitalId = await ensure(client,'hospitals','DEMO Teaching Hospital',{
      sql:`INSERT INTO hospitals(name,location_id,is_verified) VALUES($1,$2,true) RETURNING id`,
      values:['DEMO Teaching Hospital',locationId],
    });
    const bloodBankId = await ensure(client,'blood_banks','DEMO Blood Bank',{
      sql:`INSERT INTO blood_banks(name,location_id,hospital_id,is_verified) VALUES($1,$2,$3,true) RETURNING id`,
      values:['DEMO Blood Bank',locationId,hospitalId],
    });
    let organizerId = (await client.query("SELECT id FROM camp_organizers WHERE name='DEMO Volunteer Society' LIMIT 1")).rows[0]?.id;
    if(!organizerId) organizerId=(await client.query("INSERT INTO camp_organizers(name,is_verified) VALUES('DEMO Volunteer Society',true) RETURNING id")).rows[0].id;
    const account = async (email,role,fullName,orgColumn,orgId) => {
      const found = await client.query('SELECT id FROM users WHERE email=$1',[email]);
      const userId = found.rows[0]?.id || (await client.query(
        `INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id`,
        [fullName,email,hash,role],
      )).rows[0].id;
      if(orgColumn) await client.query(
        `INSERT INTO staff_memberships(user_id,${orgColumn}) VALUES($1,$2) ON CONFLICT(user_id,${orgColumn}) DO NOTHING`,
        [userId,orgId],
      );
      return userId;
    };
    await account('demo-admin@bloodbridge.test','ADMIN','DEMO Administrator');
    await account('demo-hospital@bloodbridge.test','HOSPITAL_STAFF','DEMO Hospital Staff','hospital_id',hospitalId);
    const bankStaffId = await account('demo-bank@bloodbridge.test','BANK_STAFF','DEMO Blood Bank Staff','blood_bank_id',bloodBankId);
    let camp = await client.query("SELECT id FROM donation_camps WHERE title='DEMO Community Donation Camp' LIMIT 1");
    let campId = camp.rows[0]?.id;
    if(!campId) {
      const created=await client.query(
        `INSERT INTO donation_camps(title,organizer_id,blood_bank_id,location_id,proposed_by,starts_at,ends_at,capacity,status)
         VALUES('DEMO Community Donation Camp',$1,$2,$3,$4,now()+interval '21 days',now()+interval '21 days 5 hours',80,'PENDING') RETURNING id`,
        [organizerId,bloodBankId,locationId,bankStaffId],
      );
      campId=created.rows[0].id;
      await client.query('CALL sp_approve_donation_camp($1,$2)',[campId,bankStaffId]);
    }
    return {hospitalId,bloodBankId,organizerId,locationId,campId};
  });
  console.log(JSON.stringify({message:'Synthetic demo institutions, staff, and approved future camp created. Existing demo accounts kept their previous passwords.', staffEmails:['demo-admin@bloodbridge.test','demo-hospital@bloodbridge.test','demo-bank@bloodbridge.test'],...ids},null,2));
} catch(error) { console.error(error);process.exitCode=1; }
finally {await pool.end();}
