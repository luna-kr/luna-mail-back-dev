import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum Gender { Male = 'Male', Female = 'Female' }
export enum UserStatus { Pending = 'Pending', Normal = 'Normal', Suspended = 'Suspended' }

@Entity()
export class User {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: false, comment: 'Luna Accounts Open ID' })
    related_id: string

    @Column({ type: 'varchar', length: 30, nullable: false, comment: 'Full name' })
    username: string

    @Column({ type: 'varchar', length: 30, nullable: false, comment: 'Full name' })
    full_name: string

    @Column({ type: 'char', length: 10, nullable: false, comment: 'Birthday (YYYY-MM-DD)' })
    birthday: string

    @Column({ type: 'enum', enum: Gender, nullable: false, comment: 'Gender' })
    gender: Gender

    @Column({ type: 'text', nullable: false, comment: 'Email address' })
    email_address: string

    @Column({ type: 'text', nullable: false, comment: 'Phone number' })
    phone_number: string

    @Column({ type: 'text', nullable: true, default: null, comment: 'Profile image' })
    profile_image: string | null

    @Column({ type: 'uuid', array: true, nullable: false, default: new Array(), comment: 'Permission'})
    permission: Array<string & { __brand: 'UUID' }>

    @Column({ type: 'enum', enum: UserStatus, nullable: false, default: UserStatus.Normal, comment: 'User status'})
    status: UserStatus


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}