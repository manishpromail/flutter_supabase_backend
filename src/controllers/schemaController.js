const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

/**
 * Educational endpoint explaining database relationships and checking real-time database schema status
 * GET /api/schema/relationships
 */
const getSchemaInfo = async (req, res) => {
  try {
    // Check table row counts and statuses
    const tables = ['products', 'product_details', 'reviews', 'categories', 'product_categories'];
    const tableStatus = {};

    for (const tbl of tables) {
      try {
        const { count, error } = await supabase
          .from(tbl)
          .select('id', { count: 'exact' })
          .limit(1);

        if (error) {
          tableStatus[tbl] = {
            exists: false,
            error_code: error.code,
            message: error.message
          };
        } else {
          tableStatus[tbl] = {
            exists: true,
            row_count: count ?? 0
          };
        }
      } catch (e) {
        tableStatus[tbl] = {
          exists: false,
          error: e.message
        };
      }
    }

    const allTablesExist = Object.values(tableStatus).every((t) => t.exists);

    // Read SQL file if exists
    let sqlSchema = '';
    const sqlPath = path.join(__dirname, '../../database/schema_relationships.sql');
    if (fs.existsSync(sqlPath)) {
      sqlSchema = fs.readFileSync(sqlPath, 'utf8');
    }

    return res.status(200).json({
      success: true,
      all_relational_tables_ready: allTablesExist,
      table_status: tableStatus,
      relationships: [
        {
          type: '1:1 (One-to-One)',
          primary_table: 'products',
          related_table: 'product_details',
          foreign_key: 'product_details.product_id REFERENCES products(id) UNIQUE',
          key_concept: 'Enforced by the UNIQUE constraint on the foreign key column. Each product has exactly one technical specification sheet (SKU, warranty, manufacturer, dimensions).',
          sql_snippet: 'product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE',
          mobile_use_case: 'Displayed as technical specifications card inside the Product Details Screen.'
        },
        {
          type: '1:M (One-to-Many)',
          primary_table: 'products',
          related_table: 'reviews',
          foreign_key: 'reviews.product_id REFERENCES products(id)',
          key_concept: 'The foreign key is NOT unique. A single product can have zero, one, or hundreds of reviews from customers, but each review belongs to only one product.',
          sql_snippet: 'product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE',
          mobile_use_case: 'Displayed as star ratings & list of customer feedback reviews with interactive "+ Add Review" modal.'
        },
        {
          type: 'M:M (Many-to-Many)',
          primary_table: 'products',
          related_table: 'categories',
          junction_table: 'product_categories',
          foreign_keys: [
            'product_categories.product_id REFERENCES products(id)',
            'product_categories.category_id REFERENCES categories(id)'
          ],
          key_concept: 'A product can belong to multiple categories (e.g., Electronics & Audio), and a category has multiple products. Relational databases resolve this with a Junction/Pivot Table containing composite primary key (product_id, category_id).',
          sql_snippet: 'PRIMARY KEY (product_id, category_id)',
          mobile_use_case: 'Displayed as colored category chips, category filtering on home screen, and multi-select category picker when creating products.'
        }
      ],
      sql_migration_file: 'database/schema_relationships.sql',
      sql_schema_content: sqlSchema
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to inspect schema info',
      error: err.message
    });
  }
};

module.exports = { getSchemaInfo };
