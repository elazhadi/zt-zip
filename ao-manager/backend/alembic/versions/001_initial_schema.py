"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'societes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(10), nullable=False),
        sa.Column('raison_sociale', sa.Text(), nullable=False),
        sa.Column('forme_juridique', sa.String(20)),
        sa.Column('rc', sa.Text()),
        sa.Column('if_fiscal', sa.Text()),
        sa.Column('ice', sa.String(15)),
        sa.Column('cnss', sa.Text()),
        sa.Column('patente', sa.Text()),
        sa.Column('adresse', sa.Text()),
        sa.Column('ville', sa.Text()),
        sa.Column('gerant', sa.Text()),
        sa.Column('capital', sa.Numeric()),
        sa.Column('email', sa.Text()),
        sa.Column('tel', sa.Text()),
        sa.Column('rib', sa.Text()),
        sa.Column('logo_path', sa.Text()),
        sa.Column('entete_path', sa.Text()),
        sa.Column('domaines', postgresql.ARRAY(sa.Text())),
        sa.Column('banque_domiciliation', sa.Text()),
        sa.Column('titre_directeur_banque', sa.Text()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )

    op.create_table(
        'documents_ref',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('societe_id', sa.Integer(), nullable=False),
        sa.Column('type_doc', sa.String(50)),
        sa.Column('file_path', sa.Text()),
        sa.Column('date_certification', sa.Date()),
        sa.Column('date_expiration', sa.Date()),
        sa.Column('infos_extraites', postgresql.JSONB()),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('actif', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['societe_id'], ['societes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'appels_offres',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference', sa.Text()),
        sa.Column('objet', sa.Text()),
        sa.Column('maitre_ouvrage', postgresql.JSONB()),
        sa.Column('date_limite', sa.TIMESTAMP()),
        sa.Column('procedure', sa.Text()),
        sa.Column('domaine', sa.Text()),
        sa.Column('reserve_tpme', sa.Boolean(), server_default='false'),
        sa.Column('estimation', sa.Numeric()),
        sa.Column('lots', postgresql.JSONB()),
        sa.Column('caution_provisoire', sa.Numeric()),
        sa.Column('delai_execution', postgresql.JSONB()),
        sa.Column('delai_garantie', postgresql.JSONB()),
        sa.Column('lieu_realisation', sa.Text()),
        sa.Column('marque_specifique', postgresql.JSONB()),
        sa.Column('prospectus_exige', sa.Boolean(), server_default='false'),
        sa.Column('echantillon_exige', sa.Boolean(), server_default='false'),
        sa.Column('tete_de_serie', sa.Boolean(), server_default='false'),
        sa.Column('structure_offre', postgresql.JSONB()),
        sa.Column('notation_technique', postgresql.JSONB()),
        sa.Column('offre_technique_exigee', sa.Boolean(), server_default='false'),
        sa.Column('criteres_notation', postgresql.JSONB()),
        sa.Column('fichiers_dao', postgresql.JSONB()),
        sa.Column('statut', sa.String(30), server_default='en_instance'),
        sa.Column('decision', sa.String(20)),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference'),
    )

    op.create_table(
        'reponses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ao_id', sa.Integer(), nullable=False),
        sa.Column('societe_id', sa.Integer(), nullable=False),
        sa.Column('pct_estimation', sa.Numeric()),
        sa.Column('montant_ht', sa.Numeric()),
        sa.Column('montant_ttc', sa.Numeric()),
        sa.Column('prix_detail', postgresql.JSONB()),
        sa.Column('fichiers_generes', postgresql.JSONB()),
        sa.Column('zip_path', sa.Text()),
        sa.Column('date_soumission', sa.Date()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['ao_id'], ['appels_offres.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['societe_id'], ['societes.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'marches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ao_id', sa.Integer(), nullable=False),
        sa.Column('reponse_id', sa.Integer()),
        sa.Column('societe_id', sa.Integer(), nullable=False),
        sa.Column('numero_marche', sa.Text()),
        sa.Column('montant_ht', sa.Numeric()),
        sa.Column('montant_ttc', sa.Numeric()),
        sa.Column('caution_definitive', sa.Numeric()),
        sa.Column('retenue_garantie', sa.Numeric()),
        sa.Column('statut_execution', sa.String(30)),
        sa.Column('etapes', postgresql.JSONB(), server_default='[]'),
        sa.Column('fichiers', postgresql.JSONB(), server_default='{}'),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['ao_id'], ['appels_offres.id']),
        sa.ForeignKeyConstraint(['reponse_id'], ['reponses.id']),
        sa.ForeignKeyConstraint(['societe_id'], ['societes.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'concurrents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ao_id', sa.Integer(), nullable=False),
        sa.Column('nom', sa.Text()),
        sa.Column('offre', sa.Numeric()),
        sa.Column('statut', sa.String(20)),
        sa.Column('rang', sa.Integer()),
        sa.ForeignKeyConstraint(['ao_id'], ['appels_offres.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index('ix_appels_offres_statut', 'appels_offres', ['statut'])
    op.create_index('ix_appels_offres_decision', 'appels_offres', ['decision'])
    op.create_index('ix_documents_ref_societe_type', 'documents_ref', ['societe_id', 'type_doc'])


def downgrade():
    op.drop_table('concurrents')
    op.drop_table('marches')
    op.drop_table('reponses')
    op.drop_table('appels_offres')
    op.drop_table('documents_ref')
    op.drop_table('societes')
