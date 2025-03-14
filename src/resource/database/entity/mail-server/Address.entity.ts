import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class Address {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: false, comment: 'Email Address' })
    email_address: string

    @Column({ type: 'text', nullable: false, comment: 'Password' })
    password: string

    @Column({ type: 'uuid', nullable: false, comment: 'Domain ID' })
    domain_id: string & { __brand: 'UUID' }

    @Column({ type: 'text', nullable: false, comment: 'Home directory' })
    home_directory: string

    @Column({ type: 'text', nullable: false, comment: 'Mail directory' })
    mail_directory: string

    @Column({ type: 'uuid', nullable: false, comment: 'User ID' })
    user_id: string & { __brand: 'UUID' }


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}