from .base import BaseModel, db


class Question(BaseModel):
    """NCLEX Question model"""

    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)
    difficulty_level = db.Column(db.Float, nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    answers = db.relationship("Answer", backref="question", lazy=True)


class Answer(BaseModel):
    """Student answer model"""

    __tablename__ = "answers"

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    selected_answer = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    response_time = db.Column(db.Float, nullable=False)


class Student(BaseModel):
    """Student model"""

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    progress = db.relationship("Progress", backref="student", lazy=True)
    answers = db.relationship("Answer", backref="student", lazy=True)


class Progress(BaseModel):
    """Student progress model"""

    __tablename__ = "progress"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    mastery_level = db.Column(db.Float, nullable=False)
    last_activity = db.Column(db.DateTime, nullable=False)
