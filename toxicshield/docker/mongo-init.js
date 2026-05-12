// MongoDB initialization script for ToxicShield AI
// Runs on first container start

db = db.getSiblingDB('toxicshield');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'hashed_password', 'role'],
      properties: {
        username: { bsonType: 'string', minLength: 3 },
        email: { bsonType: 'string' },
        role: { enum: ['admin', 'user', 'moderator'] },
        is_active: { bsonType: 'bool' },
        is_banned: { bsonType: 'bool' },
      }
    }
  }
});

db.createCollection('comments');
db.createCollection('moderation_actions');
db.createCollection('daily_stats');
db.createCollection('system_config');

// Create indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.comments.createIndex({ created_at: -1 });
db.comments.createIndex({ user_id: 1 });
db.comments.createIndex({ verdict: 1 });
db.comments.createIndex({ blocked: 1 });
db.moderation_actions.createIndex({ comment_id: 1 });
db.moderation_actions.createIndex({ created_at: -1 });
db.daily_stats.createIndex({ date: -1 }, { unique: true });

// Seed default system config
db.system_config.insertOne({
  key: 'global_config',
  thresholds: {
    toxic: 0.5,
    severe_toxic: 0.7,
    threat: 0.6,
    auto_block: 0.7,
  },
  features: {
    auto_block: true,
    polite_rewrite: true,
    multilingual: true,
    email_alerts: false,
  },
  model_version: 'DistilBERT-ToxicClassifier-v2',
  updated_at: new Date(),
  updated_by: 'system',
});

print('✅ ToxicShield AI database initialized successfully');
